const MAX_BODY_BYTES = 5 * 1024 * 1024;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error("요청이 너무 큽니다. 5MB 이하 영수증만 분석할 수 있습니다."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("요청 형식이 올바르지 않습니다."));
      }
    });
    req.on("error", reject);
  });
}

function extractOutputText(response) {
  if (response.output_text) return response.output_text;
  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n");
}

function buildReceiptContent({ fileName, dataUrl, pastedText, tools }) {
  const toolList = (tools || [])
    .slice(0, 120)
    .map((tool) => `- ${tool.id}: ${tool.name} (${tool.type || "-"} / ${tool.department || "-"})`)
    .join("\n");
  const content = [
    {
      type: "input_text",
      text: [
        "영수증에서 소프트웨어/SaaS 결제 정보를 추출하고, 제공된 소프트웨어 목록 중 가장 알맞은 항목에 매칭해 주세요.",
        "금액은 실제 결제/청구 총액을 사용하세요. 특히 `Total USD 60.00`, `Amount Due USD 60.00`, `$60.00`, `Paid USD 60.00`처럼 통화 코드나 통화 기호가 숫자 앞에 있는 형식을 놓치지 마세요.",
        "`Ending Balance`, `Balance`, `0.00`처럼 잔액을 의미하는 값은 결제 금액으로 사용하지 마세요.",
        "통화가 USD면 amount는 60.00처럼 원 통화 숫자로 두고 currency는 USD로 표시하세요.",
        "원화 환산은 클라이언트에서 처리하므로 이 API 응답에서는 원본 통화 금액만 반환하세요.",
        "반드시 JSON 스키마에 맞춰 응답하세요.",
        "",
        `파일명: ${fileName || ""}`,
        pastedText ? `추가 텍스트:\n${pastedText}` : "",
        "",
        "소프트웨어 목록:",
        toolList
      ].filter(Boolean).join("\n")
    }
  ];

  if (dataUrl) {
    if (dataUrl.startsWith("data:application/pdf")) {
      content.push({
        type: "input_file",
        filename: fileName || "receipt.pdf",
        file_data: dataUrl
      });
    } else {
      content.push({
        type: "input_image",
        image_url: dataUrl,
        detail: "high"
      });
    }
  }

  return content;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "OPENAI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수에 OpenAI API 키를 추가해주세요."
    });
  }

  try {
    const body = await readJsonBody(req);
    const model = process.env.OPENAI_MODEL || "gpt-5.5-mini";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: buildReceiptContent(body)
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "receipt_analysis",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["matchedToolId", "matchedToolName", "amount", "currency", "billingMonth", "confidence", "reason"],
              properties: {
                matchedToolId: { type: "string" },
                matchedToolName: { type: "string" },
                amount: { type: "number" },
                currency: { type: "string" },
                billingMonth: { type: "string", pattern: "^20\\d{2}-(0[1-9]|1[0-2])$" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                reason: { type: "string" }
              }
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI 분석 요청에 실패했습니다.",
        details: data
      });
    }

    const outputText = extractOutputText(data);
    const parsed = JSON.parse(outputText);
    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "영수증 분석 중 오류가 발생했습니다."
    });
  }
}
