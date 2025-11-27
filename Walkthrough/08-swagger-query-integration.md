# 08. Swagger API 질문 답변 기능 통합

기존 문서 검색과 동일한 화면에서 Swagger API 질문 답변 기능을 사용할 수 있도록 통합합니다.

## 목차

1. [개요](#개요)
2. [OpenAPI 스펙 업데이트](#openapi-스펙-업데이트)
3. [Swagger Query API 클라이언트](#swagger-query-api-클라이언트)
4. [타입 정의 추가](#타입-정의-추가)
5. [ChatInput 컴포넌트 개선](#chatinput-컴포넌트-개선)
6. [Chat 컴포넌트 개선](#chat-컴포넌트-개선)
7. [ChatMessage 컴포넌트 개선](#chatmessage-컴포넌트-개선)
8. [코드 블록 구문 강조 기능](#코드-블록-구문-강조-기능)
9. [사용 방법](#사용-방법)

## 개요

이 기능은 Swagger API 질문 답변 기능을 기존 문서 검색과 동일한 화면에서 사용할 수 있도록 통합합니다:

- **통합 인터페이스**: 문서 검색과 Swagger API 검색을 동일한 화면에서 사용
- **검색 타입 선택**: 사용자가 문서 검색 또는 Swagger API 검색을 선택 가능
- **대화 히스토리 지원**: `conversationId` 또는 `conversationHistory`를 통한 연속 대화
- **메시지 자동 저장**: 질문과 답변이 자동으로 데이터베이스에 저장
- **토큰 사용량 추적**: 토큰 사용량이 자동으로 추적되고 저장
- **Swagger 문서 필터링**: 특정 Swagger 문서만 검색 가능 (`swaggerKey` 파라미터)
- **코드 블록 구문 강조**: 답변의 코드 블록에 구문 강조 적용

## OpenAPI 스펙 업데이트

백엔드에서 Swagger Query API가 추가되었다면, OpenAPI 스펙을 다시 생성해야 합니다.

### API 생성

```bash
npm run generate:api
```

### 추가된 API 엔드포인트

#### `POST /swagger/query`

Swagger API 질문 답변

**인증**: JWT 토큰 필요 (모든 사용자 접근 가능)

**요청 본문:**
```json
{
  "question": "회원가입 API는 어떻게 사용하나요?",
  "conversationId": "uuid (선택)",
  "conversationHistory": [
    {
      "role": "user",
      "content": "이전 질문"
    },
    {
      "role": "assistant",
      "content": "이전 답변"
    }
  ],
  "swaggerKey": "rag_chat_api (선택, 특정 Swagger 문서만 검색)"
}
```

**응답:**
```json
{
  "success": true,
  "answer": "회원가입 API 사용법...",
  "sources": [
    {
      "endpoint": "POST /auth/register",
      "method": "POST",
      "path": "/auth/register",
      "score": 0.85,
      "swaggerKey": "rag_chat_api"
    }
  ],
  "question": "회원가입 API는 어떻게 사용하나요?",
  "rewrittenQuery": "회원가입 API 사용법",
  "usage": {
    "promptTokens": 500,
    "completionTokens": 200,
    "totalTokens": 700
  },
  "conversationId": "uuid"
}
```

**에러 응답:**
```json
{
  "success": false,
  "answer": "제공된 API 문서에는 이 질문에 대한 충분히 관련성 있는 정보가 없습니다.",
  "sources": [],
  "question": "질문",
  "rewrittenQuery": "재작성된 쿼리",
  "maxScore": 0.25,
  "threshold": 0.35
}
```

## Swagger Query API 클라이언트

### 파일 생성

`src/api/swagger.ts` 파일을 생성하여 Swagger Query API를 호출하는 함수를 구현합니다.

```typescript
import { useMutation } from '@tanstack/react-query';
import { swaggerApi } from './client';
import type { ApiQueryDto, ConversationMessage as GeneratedConversationMessage } from './generated/models';
import type { SwaggerQueryRequest, SwaggerQueryResponse, Message } from '../types/api';

/**
 * Swagger 쿼리 요청
 * 생성된 OpenAPI 클라이언트를 사용하여 API 호출
 */
export async function querySwagger(request: SwaggerQueryRequest): Promise<SwaggerQueryResponse> {
  try {
    // 생성된 타입으로 변환 (role을 enum으로 변환)
    const apiQueryDto: ApiQueryDto = {
      question: request.question,
      conversationId: request.conversationId,
      conversationHistory: request.conversationHistory?.map((msg) => ({
        role: msg.role as GeneratedConversationMessage['role'],
        content: msg.content,
      })),
      swaggerKey: request.swaggerKey,
    };

    // 생성된 API 클라이언트 사용
    const response = await swaggerApi.queryApi({ apiQueryDto });
    
    // Axios 응답에서 데이터 추출
    return (response.data as unknown) as SwaggerQueryResponse;
  } catch (error: any) {
    // 에러 처리
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorMessage = error.response.data?.message || error.response.data?.error || statusText;
      throw new Error(`API 요청 실패: ${status} ${errorMessage}`);
    } else if (error.request) {
      throw new Error('서버에 연결할 수 없습니다.');
    } else {
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.');
    }
  }
}

/**
 * Swagger 쿼리 Mutation Hook (옵션 포함)
 * 추가 옵션을 설정할 수 있는 mutation
 */
export function useSwaggerQueryMutation(options?: {
  onSuccess?: (data: SwaggerQueryResponse, variables: SwaggerQueryRequest, context: Message) => void;
  onError?: (error: Error, variables: SwaggerQueryRequest, context: Message | undefined) => void;
  onMutate?: (variables: SwaggerQueryRequest) => Message | Promise<Message>;
}) {
  return useMutation<SwaggerQueryResponse, Error, SwaggerQueryRequest, Message>({
    mutationFn: querySwagger,
    ...options,
  });
}
```

## 타입 정의 추가

`src/types/api.ts` 파일에 Swagger 관련 타입을 추가합니다.

```typescript
export interface SwaggerSource {
  endpoint: string;
  method: string;
  path: string;
  score: number;
  swaggerKey: string;
}

export interface SwaggerQueryRequest {
  question: string;
  conversationId?: string;
  conversationHistory?: ConversationMessage[];
  swaggerKey?: string;
}

export interface SwaggerQueryResponse {
  success: boolean;
  answer: string;
  sources: SwaggerSource[];
  question: string;
  conversationId?: string;
  rewrittenQuery?: string;
  usage?: Usage;
  maxScore?: number;
  threshold?: number;
}

export interface Message {
  id: string;
  question: string;
  answer?: string;
  sources?: Source[] | SwaggerSource[];
  usage?: Usage;
  isLoading?: boolean;
  error?: string;
  isSuccess?: boolean;
  queryType?: 'rag' | 'swagger';
}
```

## ChatInput 컴포넌트 개선

검색 타입 선택 기능을 추가합니다.

### 주요 변경사항

1. **검색 타입 상태 추가**
   ```typescript
   export type QueryType = 'rag' | 'swagger';
   const [queryType, setQueryType] = useState<QueryType>('rag');
   ```

2. **검색 타입 선택 UI 추가**
   - 문서 검색 / Swagger API 선택 버튼
   - 선택된 타입에 따라 placeholder 변경

3. **onSend 함수 시그니처 변경**
   ```typescript
   onSend: (question: string, queryType: QueryType) => void;
   ```

4. **Textarea 자동 높이 조절**
   - `useRef`로 textarea 참조
   - `onChange`에서 `scrollHeight`로 높이 자동 조절
   - 초기 높이를 44px로 설정 (전송 버튼 높이와 일치)

5. **전송 버튼을 동그란 아이콘 버튼으로 변경**
   - 텍스트 제거, 아이콘만 표시
   - 로딩 중에는 스피너만 표시

## Chat 컴포넌트 개선

RAG와 Swagger mutation을 모두 사용하고, 선택된 타입에 따라 적절한 API를 호출하도록 수정합니다.

### 주요 변경사항

1. **두 개의 Mutation 사용**
   ```typescript
   const ragMutation = useRAGQueryMutation({ ... });
   const swaggerMutation = useSwaggerQueryMutation({ ... });
   ```

2. **handleSend 함수 수정**
   ```typescript
   const handleSend = (question: string, queryType: QueryType) => {
     const conversationHistory = buildConversationHistory(messages);
     
     if (queryType === 'swagger') {
       // Swagger API 호출
       if (currentConversationId) {
         swaggerMutation.mutate({ question, conversationId: currentConversationId });
       } else {
         swaggerMutation.mutate({ question, conversationHistory });
       }
     } else {
       // RAG API 호출
       if (currentConversationId) {
         ragMutation.mutate({ question, conversationId: currentConversationId });
       } else {
         ragMutation.mutate({ question, conversationHistory });
       }
     }
   };
   ```

3. **로딩 상태 관리**
   - 두 mutation의 `isPending` 상태를 모두 확인
   - 로딩 중인 메시지 보존 로직 개선

4. **대화 히스토리 로드 시 queryType 추론**
   - sources 타입을 확인하여 `queryType` 자동 추론
   - Swagger source는 `endpoint`와 `method` 속성을 가짐

## ChatMessage 컴포넌트 개선

Swagger sources를 표시할 수 있도록 수정합니다.

### 주요 변경사항

1. **Swagger sources 처리**
   ```typescript
   if (message.queryType === 'swagger') {
     // Swagger sources 처리
     const swaggerSources = message.sources as SwaggerSource[];
     // API 엔드포인트, 메서드, 경로 표시
     // HTTP 메서드별 색상 구분 (GET: 초록, POST: 파랑, PUT: 노랑, DELETE: 빨강)
   } else {
     // RAG sources 처리
     const ragSources = message.sources as Source[];
     // 문서 제목, URL 표시
   }
   ```

2. **메시지 클릭 기능 제거**
   - URL 파라미터 추가 기능 제거
   - hover 스타일은 유지

## 코드 블록 구문 강조 기능

답변의 코드 블록에 구문 강조를 적용합니다.

### 패키지 설치

```bash
npm install react-syntax-highlighter @types/react-syntax-highlighter
```

### 구현

`ChatMessage` 컴포넌트에서 `ReactMarkdown`의 `components` prop을 사용하여 코드 블록을 커스터마이징합니다.

```typescript
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');
      
      return !inline && (match || codeString.length > 50) ? (
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: 0,
            background: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.6',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            border: 'none',
            borderRadius: 0,
            boxShadow: 'none',
          }}
          PreTag="div"
          showLineNumbers={codeString.split('\n').length > 5}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: 'rgba(148, 163, 184, 0.5)',
            userSelect: 'none',
          }}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      ) : (
        <code className="px-1.5 py-0.5 bg-slate-900/70 text-blue-300 rounded text-sm font-mono border border-slate-700/30" {...props}>
          {children}
        </code>
      );
    },
  }}
>
  {message.answer}
</ReactMarkdown>
```

### 주요 특징

- **인라인 코드와 코드 블록 구분**: 인라인 코드는 작은 박스로, 코드 블록은 구문 강조 적용
- **언어 자동 감지**: 마크다운의 언어 태그를 기반으로 구문 강조
- **줄 번호 표시**: 5줄 이상일 때 자동으로 줄 번호 표시
- **다크 테마**: `vscDarkPlus` 테마 사용
- **이중 박스 방지**: 코드 블록이 메시지 박스 안에서 자연스럽게 표시되도록 스타일 조정

## 사용 방법

### 1. 검색 타입 선택

질문 입력 영역 상단에서 검색 타입을 선택할 수 있습니다:

- **📄 문서 검색**: Notion 문서를 기반으로 질문에 답변
- **🔌 Swagger API**: Swagger API 문서를 기반으로 질문에 답변

### 2. 질문 입력

선택한 검색 타입에 따라 적절한 질문을 입력합니다.

**문서 검색 예시:**
- "React Query는 무엇인가요?"
- "캐싱 전략에 대해 설명해주세요"

**Swagger API 예시:**
- "회원가입 API는 어떻게 사용하나요?"
- "curl 예시 보여줘"
- "테스트 데이터 알려줘"
- "어떤 API가 있나요?"
- "파라미터는 뭐가 필요해요?"

### 3. 답변 확인

답변은 선택한 검색 타입에 따라 다른 형식으로 표시됩니다:

**문서 검색:**
- 관련 문서 링크와 유사도 점수 표시
- 문서 제목 클릭 시 원본 문서로 이동

**Swagger API:**
- 관련 API 엔드포인트, 메서드, 경로 표시
- HTTP 메서드별 색상 구분
- Swagger 문서 키 표시

### 4. 코드 블록 확인

답변에 포함된 코드 블록은 구문 강조가 적용되어 가독성이 향상됩니다:

- 키워드, 문자열, 주석 등이 색상으로 구분
- 5줄 이상일 때 줄 번호 자동 표시
- 언어 자동 감지 (JavaScript, TypeScript, JSON, Python 등)

## 주요 기능 요약

### ✅ 통합 인터페이스
- 문서 검색과 Swagger API 검색을 동일한 화면에서 사용
- 검색 타입 선택으로 간편하게 전환

### ✅ 대화 히스토리 지원
- `conversationId` 또는 `conversationHistory`를 통한 연속 대화
- RAG와 Swagger 대화를 동일한 대화에서 혼합 사용 가능

### ✅ 자동 저장 및 추적
- 질문과 답변이 자동으로 데이터베이스에 저장
- 토큰 사용량이 자동으로 추적되고 저장

### ✅ Swagger 문서 필터링
- `swaggerKey` 파라미터로 특정 Swagger 문서만 검색 가능

### ✅ 코드 블록 구문 강조
- 답변의 코드 블록에 구문 강조 적용
- 다양한 프로그래밍 언어 지원

### ✅ 사용자 경험 개선
- Textarea 자동 높이 조절
- 동그란 아이콘 전송 버튼
- 검색 타입에 따른 placeholder 변경

## 파일 구조

```
src/
├── api/
│   ├── rag.ts              # RAG API 클라이언트 (기존)
│   └── swagger.ts          # Swagger Query API 클라이언트 (신규)
├── components/
│   ├── Chat.tsx            # 메인 채팅 컴포넌트 (수정)
│   ├── ChatInput.tsx       # 질문 입력 컴포넌트 (수정)
│   └── ChatMessage.tsx     # 메시지 표시 컴포넌트 (수정)
└── types/
    └── api.ts              # TypeScript 타입 정의 (수정)
```

## 참고사항

- Swagger Query API는 모든 사용자가 접근 가능합니다 (JWT 인증만 필요)
- 관리자 전용 기능(문서 업로드, 삭제 등)은 별도의 관리자 페이지에서 사용합니다
- 코드 블록 구문 강조는 `react-syntax-highlighter` 라이브러리를 사용합니다
- 메시지 클릭 시 URL 파라미터 추가 기능은 제거되었습니다 (hover 스타일은 유지)

