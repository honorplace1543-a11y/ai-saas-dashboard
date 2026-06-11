# AI/SaaS Control Tower

전사 AI/SaaS 사용 현황, 월별 비용, 영수증, 기간별 인사이트를 관리하는 웹앱입니다.

## GitHub에 올릴 파일

아래 파일과 폴더만 올리면 됩니다. `index.html`은 반드시 레포지토리 맨 위에 있어야 합니다.

- `api/`
- `index.html`
- `public/`
- `package.json`
- `vercel.json`
- `.env.example`
- `README.md`

`work/`와 `outputs/`는 업로드하지 않아도 됩니다.

## Vercel 설정

Vercel에서 프로젝트를 만든 뒤 Environment Variables에 아래 값을 추가하세요.

```text
OPENAI_API_KEY=본인 OpenAI API 키
OPENAI_MODEL=gpt-5.4-mini
```

`OPENAI_MODEL`은 선택 사항입니다. 잘 모르겠으면 `OPENAI_API_KEY`만 넣어도 됩니다. 이미 Vercel에 `OPENAI_MODEL=gpt-5.5-mini`가 들어가 있다면 `gpt-5.4-mini`로 바꾸거나 해당 변수를 삭제해주세요.

## 사용 흐름

1. 웹앱에서 입력 월을 선택합니다.
2. 편집 모드에서 소프트웨어별 비용과 영수증을 입력합니다.
3. 영수증 자동 등록에서 영수증 파일을 업로드합니다.
4. AI가 소프트웨어, 결제월, 금액을 추정합니다.
5. 결과를 확인한 뒤 적용합니다.
