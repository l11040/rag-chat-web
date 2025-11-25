# 05. 대화 관리 기능

대화 생성, 조회, 수정, 삭제 기능을 구현하여 ChatGPT 스타일의 대화 관리 시스템을 구축합니다.

## 목차

1. [개요](#개요)
2. [API 엔드포인트](#api-엔드포인트)
3. [대화 관리 API 클라이언트](#대화-관리-api-클라이언트)
4. [대화 목록 사이드바](#대화-목록-사이드바)
5. [Chat 컴포넌트 개선](#chat-컴포넌트-개선)
6. [RAG 쿼리 API 개선](#rag-쿼리-api-개선)
7. [레이아웃 구성](#레이아웃-구성)
8. [사용 방법](#사용-방법)

## 개요

이 프로젝트는 다음과 같은 대화 관리 기능을 제공합니다:

- **대화 생성**: 새 대화를 생성하고 자동으로 선택
- **대화 목록 조회**: 사용자의 모든 대화 목록을 사이드바에 표시
- **대화 조회**: 특정 대화의 메시지 히스토리 로드
- **대화 제목 수정**: 대화 제목을 인라인으로 수정
- **대화 삭제**: 대화 삭제 기능
- **연속 대화**: `conversationId`를 사용하여 기존 대화를 이어서 진행
- **자동 대화 생성**: 질문 전송 시 `conversationId`가 없으면 서버에서 자동 생성

## API 엔드포인트

### 대화 관리 API

#### `POST /conversations`
새 대화 생성

**요청 본문:**
```json
{
  "title": "대화 제목 (선택사항)"
}
```

**응답:**
```json
{
  "success": true,
  "conversation": {
    "id": "60bf5c4e-1862-4a08-8074-ce5e1828d06c",
    "title": null,
    "createdAt": "2025-11-24T23:00:11.700Z",
    "updatedAt": "2025-11-24T23:00:11.700Z"
  }
}
```

#### `GET /conversations`
사용자의 모든 대화 목록 조회

**응답:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "60bf5c4e-1862-4a08-8074-ce5e1828d06c",
      "title": "대화 제목",
      "messageCount": 5,
      "createdAt": "2025-11-24T23:00:11.700Z",
      "updatedAt": "2025-11-25T08:00:24.818Z"
    }
  ]
}
```

#### `GET /conversations/:id`
특정 대화 조회 (메시지 포함)

**응답:**
```json
{
  "success": true,
  "conversation": {
    "id": "60bf5c4e-1862-4a08-8074-ce5e1828d06c",
    "title": null,
    "messages": [
      {
        "id": "cb89f4d2-47ff-4f6b-a6a2-f6b85cd26b15",
        "role": "user",
        "content": "안녕",
        "metadata": null,
        "createdAt": "2025-11-24T23:00:16.434Z"
      },
      {
        "id": "2e0c4114-33a8-46d8-bf68-e85d9b318eb9",
        "role": "assistant",
        "content": "제공된 문서에는 이 질문에 대한 정보가 없습니다.",
        "metadata": {
          "sources": [...],
          "usage": {...},
          "rewrittenQuery": "..."
        },
        "createdAt": "2025-11-24T23:00:18.248Z"
      }
    ],
    "createdAt": "2025-11-24T23:00:11.700Z",
    "updatedAt": "2025-11-25T08:00:24.818Z"
  }
}
```

#### `PUT /conversations/:id/title`
대화 제목 업데이트

**요청 본문:**
```json
{
  "title": "새로운 대화 제목"
}
```

**응답:**
```json
{
  "success": true,
  "conversation": {
    "id": "60bf5c4e-1862-4a08-8074-ce5e1828d06c",
    "title": "새로운 대화 제목",
    "updatedAt": "2025-11-25T08:00:24.818Z"
  }
}
```

#### `DELETE /conversations/:id`
대화 삭제

**응답:**
```json
{
  "success": true,
  "message": "대화가 삭제되었습니다."
}
```

### RAG 쿼리 API (수정됨)

#### `POST /rag/query` (수정됨)
질문에 대한 LLM 기반 답변 생성 (대화 연속 기능 추가)

**요청 본문:**
```json
{
  "question": "질문 내용",
  "conversationId": "60bf5c4e-1862-4a08-8074-ce5e1828d06c",
  "conversationHistory": [...]
}
```

**변경사항:**
- `conversationId`를 제공하면 기존 대화를 이어서 진행
- `conversationId`가 없으면 새 대화를 자동 생성
- 질문과 답변이 자동으로 저장됨

**응답:**
```json
{
  "success": true,
  "answer": "답변 내용",
  "sources": [...],
  "conversationId": "60bf5c4e-1862-4a08-8074-ce5e1828d06c",
  "usage": {...}
}
```

## 대화 관리 API 클라이언트

### 파일: `src/api/conversations.ts`

대화 관리 API를 호출하는 함수와 React Query hooks를 제공합니다.

#### 주요 기능

1. **대화 생성**: `createConversation(title?: string)`
2. **대화 목록 조회**: `getConversations()`
3. **특정 대화 조회**: `getConversation(id: string)`
4. **대화 제목 업데이트**: `updateConversationTitle(id: string, title: string)`
5. **대화 삭제**: `deleteConversation(id: string)`

#### React Query Hooks

```typescript
// 대화 목록 조회
const { data: conversations, isLoading } = useConversations();

// 특정 대화 조회
const { data: conversation } = useConversation(conversationId);

// 새 대화 생성
const createMutation = useCreateConversation();

// 대화 제목 업데이트
const updateTitleMutation = useUpdateConversationTitle();

// 대화 삭제
const deleteMutation = useDeleteConversation();
```

#### 타입 정의

```typescript
export interface Conversation {
  id: string;
  title: string | null;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: {
      sources?: Array<{
        pageTitle: string;
        pageUrl: string;
        score: number;
        chunkText: string;
      }>;
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
      rewrittenQuery?: string;
    } | null;
    createdAt: string;
  }>;
}
```

## 대화 목록 사이드바

### 파일: `src/components/ConversationSidebar.tsx`

왼쪽 사이드바에 대화 목록을 표시하는 컴포넌트입니다.

#### 주요 기능

1. **대화 목록 표시**: 사용자의 모든 대화를 시간순으로 표시
2. **새 대화 생성**: "새 대화" 버튼으로 새 대화 생성 및 선택
3. **대화 선택**: 대화 클릭 시 해당 대화 선택
4. **제목 수정**: 대화 제목을 인라인으로 수정 (더블클릭 또는 편집 버튼)
5. **대화 삭제**: 삭제 버튼으로 대화 삭제
6. **날짜 표시**: 상대적 날짜 표시 (오늘, 어제, N일 전 등)

#### 사용 방법

```typescript
<ConversationSidebar
  selectedConversationId={selectedConversationId}
  onSelectConversation={setSelectedConversationId}
/>
```

#### Props

- `selectedConversationId`: 현재 선택된 대화 ID
- `onSelectConversation`: 대화 선택 시 호출되는 콜백 함수

## Chat 컴포넌트 개선

### 파일: `src/components/Chat.tsx`

대화 로드 및 연속 대화 기능을 추가했습니다.

#### 주요 변경사항

1. **대화 로드**: `conversationId`가 제공되면 해당 대화의 메시지 히스토리 로드
2. **메시지 변환**: 서버 응답의 메시지를 UI에 표시할 수 있는 형식으로 변환
3. **연속 대화**: `conversationId`를 사용하여 기존 대화를 이어서 진행
4. **자동 대화 생성**: 새 대화 생성 시 대화 목록 자동 새로고침

#### Props

```typescript
interface ChatProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}
```

#### 메시지 로드 로직

```typescript
// 대화 변경 시 메시지 로드
useEffect(() => {
  if (conversationId && conversation) {
    // 대화 메시지를 Message 형식으로 변환
    const loadedMessages: Message[] = [];
    let currentUserMessage: Message | null = null;

    conversation.messages.forEach((msg) => {
      if (msg.role === 'user') {
        if (currentUserMessage) {
          loadedMessages.push(currentUserMessage);
        }
        currentUserMessage = {
          id: msg.id,
          question: msg.content,
          isLoading: false,
        };
      } else if (msg.role === 'assistant' && currentUserMessage) {
        // metadata에서 sources와 usage 추출
        const metadata = msg.metadata;
        currentUserMessage.answer = msg.content;
        currentUserMessage.isSuccess = true;
        if (metadata?.sources) {
          currentUserMessage.sources = metadata.sources;
        }
        if (metadata?.usage) {
          currentUserMessage.usage = metadata.usage;
        }
        loadedMessages.push(currentUserMessage);
        currentUserMessage = null;
      }
    });

    if (currentUserMessage) {
      loadedMessages.push(currentUserMessage);
    }

    setMessages(loadedMessages);
  } else if (!conversationId) {
    setMessages([]);
  }
}, [conversationId, conversation]);
```

## RAG 쿼리 API 개선

### 파일: `src/api/rag.ts`

`conversationId` 지원을 추가했습니다.

#### 변경사항

```typescript
export interface RAGQueryRequest {
  question: string;
  conversationId?: string;  // 추가됨
  conversationHistory?: ConversationMessage[];
}

export interface RAGQueryResponse {
  success: boolean;
  answer: string;
  sources: Source[];
  question: string;
  conversationId?: string;  // 추가됨
  // ...
}
```

#### 사용 방법

```typescript
// conversationId가 있으면 사용
if (currentConversationId) {
  mutation.mutate({ question, conversationId: currentConversationId });
} else {
  // 없으면 conversationHistory 사용
  const conversationHistory = buildConversationHistory(messages);
  mutation.mutate({ question, conversationHistory });
}
```

## 레이아웃 구성

### 파일: `src/App.tsx`

사이드바와 메인 콘텐츠 영역을 분리한 레이아웃을 구성했습니다.

#### 구조

```typescript
function ChatLayout() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <>
      <div className="fixed left-0 top-0 w-64 h-screen z-20">
        <ConversationSidebar
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>
      <div className="ml-64">
        <Chat 
          conversationId={selectedConversationId} 
          onConversationCreated={setSelectedConversationId}
        />
      </div>
    </>
  );
}
```

#### 레이아웃 특징

- **사이드바**: 왼쪽에 고정 (fixed), 너비 256px
- **메인 콘텐츠**: 사이드바 옆에 배치 (margin-left: 256px)
- **브라우저 스크롤**: 전체 페이지 스크롤 사용

## 사용 방법

### 1. 새 대화 생성

사이드바의 "새 대화" 버튼을 클릭하면 새 대화가 생성되고 자동으로 선택됩니다.

### 2. 기존 대화 선택

사이드바에서 대화를 클릭하면 해당 대화의 메시지 히스토리가 로드되어 표시됩니다.

### 3. 대화 제목 수정

대화 목록에서 편집 버튼을 클릭하거나 대화를 더블클릭하면 제목을 수정할 수 있습니다.

### 4. 대화 삭제

대화 목록에서 삭제 버튼을 클릭하면 대화를 삭제할 수 있습니다.

### 5. 연속 대화

기존 대화를 선택한 상태에서 질문을 전송하면 해당 대화에 메시지가 추가됩니다.

### 6. 자동 대화 생성

새 대화 상태에서 질문을 전송하면 서버에서 자동으로 새 대화를 생성하고 `conversationId`를 반환합니다.

## API 클라이언트 설정

### 파일: `src/api/client.ts`

`ConversationApi`를 추가했습니다.

```typescript
import { ConversationApi } from './generated';

export const conversationApi = new ConversationApi(
  configuration, 
  API_BASE_URL, 
  axiosInstance
);
```

## 주요 파일 구조

```
src/
├── api/
│   ├── client.ts              # API 클라이언트 설정 (conversationApi 추가)
│   ├── conversations.ts       # 대화 관리 API 함수 및 hooks
│   └── rag.ts                 # RAG 쿼리 API (conversationId 지원 추가)
├── components/
│   ├── Chat.tsx               # Chat 컴포넌트 (대화 로드 기능 추가)
│   └── ConversationSidebar.tsx # 대화 목록 사이드바
└── App.tsx                    # 레이아웃 구성
```

## 주요 기능 흐름

### 대화 생성 및 선택

1. 사용자가 "새 대화" 버튼 클릭
2. `createConversation()` 호출
3. 새 대화 생성 및 ID 반환
4. `onSelectConversation()` 호출하여 대화 선택
5. Chat 컴포넌트에서 `conversationId`로 대화 로드

### 질문 전송

1. 사용자가 질문 입력 및 전송
2. `conversationId`가 있으면 해당 ID로 요청
3. `conversationId`가 없으면 `conversationHistory`로 요청
4. 서버에서 응답 반환 (새 대화인 경우 `conversationId` 포함)
5. 응답에 `conversationId`가 있으면 상태 업데이트
6. 대화 목록 자동 새로고침

### 대화 로드

1. 사용자가 대화 선택
2. `useConversation(conversationId)` hook으로 대화 데이터 로드
3. 메시지를 UI 형식으로 변환
4. 메시지 목록에 표시

## 에러 처리

모든 API 호출은 다음과 같은 에러 처리를 포함합니다:

- **네트워크 에러**: "서버에 연결할 수 없습니다."
- **HTTP 에러**: 상태 코드와 에러 메시지 표시
- **기타 에러**: "알 수 없는 오류가 발생했습니다."

## 참고사항

- 대화 제목이 없는 경우 "새 대화"로 표시됩니다.
- 대화 삭제 시 확인 다이얼로그가 표시됩니다.
- 대화 목록은 최신 순으로 정렬됩니다.
- 날짜는 상대적 형식으로 표시됩니다 (오늘, 어제, N일 전 등).

