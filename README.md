# RAG Chat Web

RAG(Retrieval-Augmented Generation) 기반 지식 검색 챗봇 웹 애플리케이션입니다. React, TypeScript, Tailwind CSS로 구축된 모던한 채팅 인터페이스를 제공합니다.

## ✨ 주요 기능

- 💬 **대화형 챗봇 인터페이스**: 직관적이고 세련된 채팅 UI
- 📚 **문서 검색 및 참조**: 관련 문서 링크와 유사도 점수 표시
- 🔄 **대화 히스토리 지원**: 이전 대화 맥락을 활용한 연속 대화
- 📝 **마크다운 렌더링**: 코드 블록, 리스트, 링크 등 마크다운 형식 지원
- 💡 **토큰 사용량 표시**: 프롬프트, 완성, 총 토큰 사용량 실시간 표시
- 🎨 **모던한 디자인**: Tailwind CSS 기반의 다크 테마 UI
- ⚡ **빠른 개발 환경**: Vite를 활용한 빠른 HMR(Hot Module Replacement)

## 🛠 기술 스택

### 핵심 기술
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구 및 개발 서버

### 상태 관리 & 데이터 페칭
- **React Query (@tanstack/react-query)** - 서버 상태 관리 및 캐싱

### 스타일링
- **Tailwind CSS** - 유틸리티 기반 CSS 프레임워크
- **PostCSS** - CSS 후처리

### 마크다운
- **react-markdown** - 마크다운 렌더링
- **remark-gfm** - GitHub Flavored Markdown 지원

## 📦 설치 및 실행

### 필수 요구사항
- Node.js 18 이상
- npm 또는 yarn

### 설치

```bash
npm install
```

### 환경 변수 설정

`.env` 파일을 생성하고 API 서버 URL을 설정하세요:

```bash
VITE_API_BASE_URL=http://localhost:3001
```

`.env.example` 파일을 참고할 수 있습니다.

### 개발 서버 실행

```bash
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3008`에서 실행됩니다.

### 프로덕션 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 디렉토리에 생성됩니다.

### 빌드 미리보기

```bash
npm run preview
```

## 📁 프로젝트 구조

```
rag-chat-web/
├── src/
│   ├── api/
│   │   └── rag.ts              # RAG API 클라이언트
│   ├── components/
│   │   ├── ChatInput.tsx       # 채팅 입력 컴포넌트
│   │   └── ChatMessage.tsx     # 메시지 표시 컴포넌트
│   ├── types/
│   │   └── api.ts              # TypeScript 타입 정의
│   ├── App.tsx                  # 메인 앱 컴포넌트
│   ├── main.tsx                 # 앱 진입점
│   └── index.css                # 전역 스타일 및 Tailwind 설정
├── index.html                   # HTML 템플릿
├── vite.config.ts               # Vite 설정
├── tailwind.config.js           # Tailwind CSS 설정
├── tsconfig.json                # TypeScript 설정
└── package.json                 # 프로젝트 의존성
```

## 🔌 API 엔드포인트

### RAG 쿼리

**POST** `/rag/query`

요청 본문:
```json
{
  "question": "질문 내용",
  "conversationHistory": [
    {
      "role": "user",
      "content": "이전 사용자 질문"
    },
    {
      "role": "assistant",
      "content": "이전 어시스턴트 답변"
    }
  ]
}
```

응답 예시:
```json
{
  "success": true,
  "answer": "답변 내용 (마크다운 형식)",
  "sources": [
    {
      "pageTitle": "문서 제목",
      "pageUrl": "https://example.com",
      "score": 0.85,
      "chunkText": "관련 텍스트 조각"
    }
  ],
  "question": "원본 질문",
  "rewrittenQuery": "재작성된 쿼리",
  "usage": {
    "promptTokens": 1500,
    "completionTokens": 200,
    "totalTokens": 1700
  }
}
```

## 🎨 주요 기능 설명

### 대화 히스토리
이전 대화 내용을 자동으로 히스토리에 포함하여 API에 전달합니다. 이를 통해 맥락을 이해한 더 정확한 답변을 받을 수 있습니다.

### 마크다운 렌더링
답변 내용은 마크다운 형식으로 렌더링됩니다:
- 제목 (H1-H6)
- 리스트 (순서 있는/없는)
- 코드 블록 및 인라인 코드
- 링크
- 인용구
- 표

### 관련 문서 표시
답변에 사용된 문서 소스를 표시하며, 각 문서의 유사도 점수를 함께 보여줍니다. 문서 제목을 클릭하면 새 탭에서 해당 문서를 열 수 있습니다.

### 토큰 사용량 모니터링
각 답변에 사용된 토큰 수를 실시간으로 표시하여 API 사용량을 추적할 수 있습니다.

## 🚀 개발 스크립트

- `npm run dev` - 개발 서버 실행 (포트: 3008)
- `npm run build` - 프로덕션 빌드
- `npm run preview` - 빌드 결과 미리보기
- `npm run lint` - ESLint로 코드 검사

## 📝 라이선스

이 프로젝트는 비공개 프로젝트입니다.

## 🤝 기여

이슈나 개선 사항이 있으면 이슈를 등록해주세요.

