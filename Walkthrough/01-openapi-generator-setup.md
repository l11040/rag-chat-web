# 01. OpenAPI Generator 설정

OpenAPI Generator를 사용하여 백엔드 API 스펙에서 TypeScript 클라이언트를 자동 생성하고, React Query를 활용한 API 요청 구조를 구성합니다.

## 목차

1. [개요](#개요)
2. [패키지 설치](#패키지-설치)
3. [환경 변수 설정](#환경-변수-설정)
4. [OpenAPI Generator 설정](#openapi-generator-설정)
5. [API 생성 스크립트](#api-생성-스크립트)
6. [클라이언트 구조](#클라이언트-구조)
7. [사용 방법](#사용-방법)

## 개요

이 프로젝트는 OpenAPI Generator를 사용하여:
- 백엔드 OpenAPI 스펙에서 TypeScript 클라이언트 자동 생성
- 환경 변수로 OpenAPI 스펙 URL/경로 관리
- Axios 기반 클라이언트에 인터셉터 설정
- React Query를 활용한 API 요청 관리

## 패키지 설치

필요한 패키지를 설치합니다:

```bash
npm install axios
npm install -D @openapitools/openapi-generator-cli dotenv
```

### 설치된 패키지

**의존성 (dependencies)**
- `axios`: HTTP 클라이언트 (생성된 API 클라이언트가 사용)
- `@tanstack/react-query`: 서버 상태 관리 및 캐싱

**개발 의존성 (devDependencies)**
- `@openapitools/openapi-generator-cli`: OpenAPI Generator CLI
- `dotenv`: 환경 변수 로드

## 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정합니다:

```bash
# API Base URL
VITE_API_BASE_URL=http://localhost:3001

# OpenAPI Specification
# NestJS의 경우 /api-json 엔드포인트 사용
VITE_OPENAPI_SPEC_URL=http://localhost:3001/api-json
# 또는 로컬 파일 사용:
# VITE_OPENAPI_SPEC_PATH=./openapi.json
```

### 환경 변수 설명

- `VITE_API_BASE_URL`: API 서버의 기본 URL
- `VITE_OPENAPI_SPEC_URL`: OpenAPI 스펙의 URL (우선 사용)
- `VITE_OPENAPI_SPEC_PATH`: 로컬 OpenAPI 스펙 파일 경로 (URL이 없을 때 사용)

## OpenAPI Generator 설정

### 설정 파일: `openapi-generator-config.yaml`

```yaml
generatorName: typescript-axios
outputDir: src/api/generated
additionalProperties:
  npmName: rag-chat-api
  npmVersion: 1.0.0
  supportsES6: true
  withInterfaces: true
  enumPropertyNaming: original
  stringEnums: true
  modelPropertyNaming: original
  useSingleRequestParameter: true
  withSeparateModelsAndApi: true
  apiPackage: api
  modelPackage: models
  typescriptThreePlus: true
  removeOperationIdPrefix: true
  enumUnknownDefaultCase: false
  useObjectParameters: false
  exportCore: true
  exportServices: true
  exportModels: true
  exportSchemas: false
  dateLibrary: standard
  usePromise: true
  supportsAsync: true
  useESM: true
```

### 주요 설정 옵션

- `generatorName: typescript-axios`: TypeScript Axios 클라이언트 생성
- `outputDir: src/api/generated`: 생성된 파일 출력 디렉토리
- `withSeparateModelsAndApi: true`: 모델과 API를 분리하여 생성
- `useESM: true`: ES Module 형식으로 생성

## API 생성 스크립트

### 스크립트 파일: `scripts/generate-api.js`

환경 변수를 읽어 OpenAPI Generator를 실행하는 스크립트입니다.

#### 주요 기능

1. **환경 변수 로드**: `.env` 파일에서 OpenAPI 스펙 URL/경로 읽기
2. **URL 유효성 검사**: 서버 연결 및 OpenAPI 스펙 형식 확인
3. **에러 처리**: 명확한 에러 메시지 제공

#### 실행 방법

```bash
npm run generate:api
```

### package.json 스크립트

```json
{
  "scripts": {
    "generate:api": "node scripts/generate-api.js",
    "build": "npm run generate:api && tsc && vite build"
  }
}
```

빌드 시 자동으로 API가 생성됩니다.

## 클라이언트 구조

### 1. `src/api/client.ts` - 클라이언트 설정 및 인터셉터

생성된 OpenAPI 클라이언트를 설정하고 Axios 인터셉터를 구성합니다.

```typescript
import axios, { type AxiosInstance } from 'axios';
import { Configuration } from './generated';
import { RAGApi, DefaultApi, AppApi, NotionApi, OpenaiApi } from './generated';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Axios 인스턴스 생성
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request 인터셉터
axiosInstance.interceptors.request.use(
  (config) => {
    // 요청 전 처리 (예: 토큰 추가, 로깅 등)
    return config;
  },
  (error) => Promise.reject(error)
);

// Response 인터셉터
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // 응답 에러 처리
    return Promise.reject(error);
  }
);

// OpenAPI 클라이언트 설정
const configuration = new Configuration({
  basePath: API_BASE_URL,
});

// 생성된 API 클라이언트 인스턴스들 export
export const ragApi = new RAGApi(configuration, API_BASE_URL, axiosInstance);
export const defaultApi = new DefaultApi(configuration, API_BASE_URL, axiosInstance);
// ... 기타 API 클라이언트들
```

### 2. `src/api/rag.ts` - RAG 기능 및 React Query Hooks

RAG 관련 API 호출 함수와 React Query hooks를 정의합니다.

```typescript
import { useMutation } from '@tanstack/react-query';
import { ragApi } from './client';
import type { QueryDto, ConversationMessage } from './generated/models';
import type { RAGQueryRequest, RAGQueryResponse, Message } from '../types/api';

// RAG 쿼리 요청 함수
export async function queryRAG(request: RAGQueryRequest): Promise<RAGQueryResponse> {
  // 타입 변환 및 API 호출
  const queryDto: QueryDto = {
    question: request.question,
    conversationHistory: request.conversationHistory?.map((msg) => ({
      role: msg.role as ConversationMessage['role'],
      content: msg.content,
    })),
  };

  const response = await ragApi.query({ queryDto });
  return (response.data as unknown) as RAGQueryResponse;
}

// React Query Mutation Hook
export function useRAGQueryMutation(options?: {
  onSuccess?: (data: RAGQueryResponse, variables: RAGQueryRequest, context: Message) => void;
  onError?: (error: Error, variables: RAGQueryRequest, context: Message | undefined) => void;
  onMutate?: (variables: RAGQueryRequest) => Message | Promise<Message>;
}) {
  return useMutation<RAGQueryResponse, Error, RAGQueryRequest, Message>({
    mutationFn: queryRAG,
    ...options,
  });
}
```

## 사용 방법

### 컴포넌트에서 사용

```typescript
import { useRAGQueryMutation } from './api/rag';

function App() {
  const mutation = useRAGQueryMutation({
    onMutate: async (variables) => {
      // 낙관적 업데이트
      const newMessage = { id: Date.now().toString(), question: variables.question };
      return newMessage;
    },
    onSuccess: (data, variables, context) => {
      // 성공 시 처리
      console.log('응답:', data);
    },
    onError: (error, variables, context) => {
      // 에러 처리
      console.error('에러:', error);
    },
  });

  const handleSend = (question: string) => {
    mutation.mutate({ question, conversationHistory: [] });
  };

  return (
    <div>
      <button onClick={() => handleSend('질문')}>전송</button>
      {mutation.isPending && <p>로딩 중...</p>}
    </div>
  );
}
```

## 파일 구조

```
src/api/
├── client.ts              # OpenAPI 클라이언트 설정 + 인터셉터
├── rag.ts                 # RAG 기능 + React Query hooks
└── generated/            # 생성된 OpenAPI 클라이언트
    ├── api/              # API 클라이언트들
    ├── models/           # 타입 정의들
    ├── configuration.ts  # 설정 클래스
    └── index.ts          # Export 파일
```

## 주의사항

1. **생성된 파일 수정 금지**: `src/api/generated` 폴더의 파일은 자동 생성되므로 수정하지 마세요.
2. **환경 변수 설정**: `.env` 파일에 올바른 OpenAPI 스펙 URL을 설정해야 합니다.
3. **서버 실행**: API 생성 시 서버가 실행 중이어야 합니다 (URL 사용 시).
4. **타입 변환**: 생성된 타입과 기존 타입 간 변환이 필요할 수 있습니다.

## 트러블슈팅

### 서버 연결 실패

```
❌ 오류: 서버에 연결할 수 없습니다.
```

**해결 방법:**
- API 서버가 실행 중인지 확인
- `.env` 파일의 `VITE_OPENAPI_SPEC_URL` 확인
- 브라우저에서 해당 URL 접근 가능한지 확인

### OpenAPI 스펙 형식 오류

```
⚠️ 경고: URL이 OpenAPI 스펙(JSON/YAML)을 반환하지 않는 것 같습니다.
```

**해결 방법:**
- Swagger UI HTML이 아닌 실제 JSON/YAML 스펙 경로 사용
- NestJS: `/api-json` 엔드포인트 사용
- FastAPI: `/openapi.json` 엔드포인트 사용

### 타입 에러

생성된 타입과 기존 타입 간 불일치가 발생할 수 있습니다. `rag.ts`에서 타입 변환을 처리합니다.

## 참고 자료

- [OpenAPI Generator 문서](https://openapi-generator.tech/)
- [React Query 문서](https://tanstack.com/query/latest)
- [Axios 문서](https://axios-http.com/)

