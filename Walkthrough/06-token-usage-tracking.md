# 06. 토큰 사용량 추적 기능

모든 사용자가 접근 가능한 관리 페이지에서 토큰 사용량을 다양한 방식으로 조회하고 시각화하는 기능을 구현합니다.

## 목차

1. [개요](#개요)
2. [API 엔드포인트](#api-엔드포인트)
3. [토큰 사용량 API 클라이언트](#토큰-사용량-api-클라이언트)
4. [관리 페이지 컴포넌트](#관리-페이지-컴포넌트)
5. [Chat 컴포넌트에 관리 버튼 추가](#chat-컴포넌트에-관리-버튼-추가)
6. [토큰 사용량 조회 UI](#토큰-사용량-조회-ui)
7. [D3.js 차트 구현](#d3js-차트-구현)
8. [라우팅 및 네비게이션](#라우팅-및-네비게이션)
9. [사용 방법](#사용-방법)

## 개요

이 기능은 다음과 같은 토큰 사용량 추적 기능을 제공합니다:

- **통계 조회**: 총 프롬프트 토큰, 완성 토큰, 전체 토큰 수, 사용 횟수, 평균 토큰 수
- **목록 조회**: 페이지네이션을 지원하는 토큰 사용 내역 목록
- **대화별 조회**: 특정 대화에서 사용된 토큰 사용량 조회
- **메시지별 조회**: 특정 메시지에서 사용된 토큰 사용량 조회
- **기간별 조회**: 지정한 날짜 범위의 토큰 사용량 조회
- **시각화**: D3.js를 사용한 바 차트 및 라인 차트
- **자동 저장**: `POST /rag/query` 시 토큰 사용량이 자동으로 저장됨
- **네비게이션**: 토큰 사용량 테이블에서 대화/메시지로 직접 이동

## API 엔드포인트

### 토큰 사용량 API

#### `GET /token-usage`
사용자의 토큰 사용량 내역을 조회합니다.

**쿼리 파라미터:**
- `limit` (선택): 결과 제한 수
- `offset` (선택): 오프셋

**응답:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "conversationId": "uuid",
    "promptTokens": 1500,
    "completionTokens": 200,
    "totalTokens": 1700,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
]
```

#### `GET /token-usage/stats`
사용자의 토큰 사용량 통계를 조회합니다.

**응답:**
```json
{
  "success": true,
  "stats": {
    "totalPromptTokens": 5069,
    "totalCompletionTokens": 335,
    "totalTokens": 5404,
    "usageCount": 2,
    "averageTokensPerQuery": 2702
  }
}
```

#### `GET /token-usage/conversation/:conversationId`
특정 대화에서 사용된 토큰 사용량을 조회합니다.

**응답:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "conversationId": "uuid",
    "messageId": "uuid",
    "promptTokens": 1500,
    "completionTokens": 200,
    "totalTokens": 1700,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
]
```

#### `GET /token-usage/message/:messageId`
특정 메시지에서 사용된 토큰 사용량을 조회합니다.

**응답:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "conversationId": "uuid",
  "messageId": "uuid",
  "promptTokens": 1500,
  "completionTokens": 200,
  "totalTokens": 1700,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

#### `GET /token-usage/date-range`
지정한 날짜 범위의 토큰 사용량을 조회합니다.

**쿼리 파라미터:**
- `startDate` (필수): 시작일 (ISO 8601 형식)
- `endDate` (필수): 종료일 (ISO 8601 형식)

**응답:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "conversationId": "uuid",
    "messageId": "uuid",
    "promptTokens": 1500,
    "completionTokens": 200,
    "totalTokens": 1700,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
]
```

### 자동 저장

#### `POST /rag/query`
질문에 대한 답변 생성 시 토큰 사용량이 자동으로 저장됩니다.

각 질문마다 프롬프트 토큰, 완성 토큰, 총 토큰 수가 데이터베이스에 기록됩니다.
답변 메시지 저장 후 반환된 메시지 ID가 토큰 사용량 저장 시 포함되어, 각 질문의 토큰 사용량이 해당 메시지와 1:1로 연결되어 추적 가능합니다.

## 토큰 사용량 API 클라이언트

### 파일: `src/api/tokenUsage.ts`

토큰 사용량 API를 호출하는 클라이언트 함수들을 정의합니다.

#### 타입 정의

```typescript
export interface TokenUsage {
  id: string;
  userId: string;
  conversationId?: string;
  messageId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  createdAt: string;
}
```

export interface TokenUsageStats {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  usageCount: number;
  averageTokens: number;
}

export interface TokenUsageDateRangeParams {
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
}

export interface TokenUsageListParams {
  limit?: number;
  offset?: number;
}
```

#### API 함수

```typescript
// 토큰 사용량 목록 조회
export async function getTokenUsage(params?: TokenUsageListParams): Promise<TokenUsage[]>

// 토큰 사용량 통계 조회
export async function getTokenUsageStats(): Promise<TokenUsageStats>

// 특정 대화의 토큰 사용량 조회
export async function getTokenUsageByConversation(conversationId: string): Promise<TokenUsage[]>

// 특정 메시지의 토큰 사용량 조회
export async function getTokenUsageByMessage(messageId: string): Promise<TokenUsage | null>

// 날짜 범위별 토큰 사용량 조회
export async function getTokenUsageByDateRange(params: TokenUsageDateRangeParams): Promise<TokenUsage[]>
```

#### 구현 세부사항

- `axiosInstance`를 사용하여 인증 토큰이 자동으로 포함됩니다
- API 응답 구조가 다양할 수 있으므로 안전하게 처리합니다:
  - 배열이 직접 오거나 `data` 속성 안에 있을 수 있음
  - 통계 응답은 `stats` 객체 안에 있을 수 있음
  - 필드명이 다른 경우를 대비한 매핑 (`averageTokensPerQuery` → `averageTokens`)

### 파일: `src/api/client.ts`

`axiosInstance`를 export하여 다른 모듈에서 사용할 수 있도록 합니다.

```typescript
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## 관리 페이지 컴포넌트

### 파일: `src/components/Management.tsx`

모든 사용자가 접근 가능한 관리 페이지를 생성합니다.

#### 주요 기능

- 좌측 sticky 사이드바 메뉴
- 우측 메인 컨텐츠 영역
- 헤더에 현재 사용자 정보 및 네비게이션 버튼

#### 구조

```typescript
type MenuType = 'token-usage';

interface MenuItem {
  id: MenuType;
  label: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  {
    id: 'token-usage',
    label: '토큰 사용량',
    icon: <ChartIcon />,
  },
];
```

#### 레이아웃

- 좌측 사이드바: `sticky top-0 h-screen`으로 스크롤 시 상단 고정
- 활성 메뉴 표시: 좌측에 파란색 바와 배경색 변경
- 우측 영역: 헤더(고정) + 스크롤 가능한 컨텐츠

## Chat 컴포넌트에 관리 버튼 추가

### 파일: `src/components/Chat.tsx`

우측 상단 헤더에 관리 페이지로 이동하는 아이콘 버튼을 추가합니다.

#### 변경 사항

```typescript
<button
  onClick={() => navigate('/management')}
  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
  title="관리 페이지"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {/* 설정 아이콘 */}
  </svg>
</button>
```

모든 사용자가 접근할 수 있도록 관리자 권한 체크 없이 표시됩니다.

## 토큰 사용량 조회 UI

### 파일: `src/components/TokenUsageView.tsx`

토큰 사용량을 다양한 방식으로 조회할 수 있는 뷰 컴포넌트입니다.

#### 뷰 타입

```typescript
type ViewType = 'overview' | 'list' | 'date-range' | 'conversation';
```

#### 개요 뷰

- 통계 카드: 총 프롬프트 토큰, 완성 토큰, 전체 토큰 수, 사용 횟수, 평균 토큰 수
- 바 차트: 프롬프트 토큰과 완성 토큰 비교

#### 목록 뷰

- 페이지네이션 지원
- 토큰 사용 내역 테이블 표시

#### 기간별 조회 뷰

- 시작일/종료일 선택
- 시간별 라인 차트
- 해당 기간의 토큰 사용 내역 테이블

#### React Query 사용

```typescript
// 통계 조회
const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
  queryKey: ['tokenUsageStats'],
  queryFn: getTokenUsageStats,
});

// 목록 조회
const { data: usageList, isLoading: listLoading } = useQuery({
  queryKey: ['tokenUsage', pagination],
  queryFn: () => getTokenUsage(pagination),
  enabled: viewType === 'list',
});

// 날짜 범위 조회
const { data: dateRangeData, isLoading: dateRangeLoading } = useQuery({
  queryKey: ['tokenUsageDateRange', dateRange],
  queryFn: () => getTokenUsageByDateRange({ ... }),
  enabled: viewType === 'date-range',
});
```

### 파일: `src/components/TokenUsageTable.tsx`

토큰 사용 내역을 테이블로 표시하는 컴포넌트입니다.

#### 주요 기능

- 날짜, 대화 ID, 프롬프트 토큰, 완성 토큰, 총 토큰 표시
- 페이지네이션 지원 (선택사항)
- 한국 시간대(KST)로 날짜 포맷팅
- **대화 ID 클릭 시 해당 대화/메시지로 이동**: `messageId`가 있으면 해당 메시지로, 없으면 대화로 이동

#### 구현

```typescript
interface TokenUsageTableProps {
  data: TokenUsage[];
  pagination?: { limit: number; offset: number };
  onPaginationChange?: (pagination: { limit: number; offset: number }) => void;
}

// 대화 ID 클릭 핸들러
const handleConversationClick = (conversationId: string, messageId?: string) => {
  if (messageId) {
    navigate(`/?conversation=${conversationId}&message=${messageId}`);
  } else {
    navigate(`/?conversation=${conversationId}`);
  }
};
```

## D3.js 차트 구현

### 패키지 설치

```bash
npm install d3 @types/d3
```

### 파일: `src/components/TokenUsageChart.tsx`

개요 뷰에서 사용하는 바 차트 컴포넌트입니다.

#### 주요 기능

- 프롬프트 토큰과 완성 토큰 비교 바 차트
- 그라데이션 효과
- 애니메이션 (바가 아래에서 위로 나타남)
- Tooltip (호버 시 상세 정보 표시)
- 호버 효과 (마우스 오버 시 확대 및 그림자 강화)

#### 구현 세부사항

- D3.js를 사용한 SVG 차트
- 반응형 tooltip 위치 조정
- 값 레이블 표시

### 파일: `src/components/TokenUsageTimeChart.tsx`

기간별 조회 뷰에서 사용하는 라인 차트 컴포넌트입니다.

#### 주요 기능

- 시간별 토큰 사용량 라인 차트
- 영역 채우기 (그라데이션)
- 라인 그리기 애니메이션
- 데이터 포인트 애니메이션 (순차적으로 나타남)
- Tooltip (호버 시 날짜, 프롬프트 토큰, 완성 토큰, 총 토큰 표시)
- 호버 효과 (포인트 확대)

#### 구현 세부사항

- D3.js의 `scaleTime`을 사용한 시간 축
- `curveMonotoneX`를 사용한 부드러운 곡선
- 그라데이션 라인 (보라색에서 파란색으로 변화)

## 라우팅 및 네비게이션

### 파일: `src/App.tsx`

관리 페이지 라우트를 추가하고, URL searchParam을 통한 대화/메시지 네비게이션을 구현합니다.

#### 라우트 추가

```typescript
import { Management } from './components/Management';

// 라우트 추가
<Route
  path="/management"
  element={
    <ProtectedRoute>
      <Management />
    </ProtectedRoute>
  }
/>
```

모든 인증된 사용자가 접근할 수 있도록 `ProtectedRoute`로만 보호합니다 (관리자 권한 불필요).

#### URL SearchParam을 통한 네비게이션

```typescript
function ChatLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationIdFromUrl);

  // URL의 conversation 파라미터가 변경되면 상태 업데이트
  useEffect(() => {
    setSelectedConversationId(conversationIdFromUrl);
  }, [conversationIdFromUrl]);

  const handleSelectConversation = (id: string | null) => {
    setSelectedConversationId(id);
    if (id) {
      setSearchParams({ conversation: id });
    } else {
      setSearchParams({});
    }
  };
}
```

### 파일: `src/components/Chat.tsx`

#### 메시지 ID 매칭

Chat 컴포넌트에서 대화를 로드할 때, assistant 메시지의 ID를 메시지 ID로 사용합니다:

```typescript
conversation.messages.forEach((msg) => {
  if (msg.role === 'user') {
    currentUserMessage = {
      id: msg.id,
      question: msg.content,
      isLoading: false,
    };
  } else if (msg.role === 'assistant' && currentUserMessage) {
    // assistant 메시지의 ID를 메시지 ID로 사용 (TokenUsage의 messageId와 매칭)
    currentUserMessage.id = msg.id;
    currentUserMessage.answer = msg.content;
    // ...
  }
});
```

#### 자동 스크롤 로직

1. **초기 로드**: 메시지가 처음 로드되면 즉시 맨 아래로 스크롤 (애니메이션 없음)
2. **메시지로 이동**: URL에 `message` 파라미터가 있으면 해당 메시지로 부드럽게 스크롤
3. **새 메시지**: 채팅 전송 시 항상 맨 아래로 스크롤

```typescript
// 1단계: 처음 메시지가 로드되면 즉시 맨 아래로 (애니메이션 없음)
useEffect(() => {
  if (messages.length > 0 && !hasInitialScrolled.current && messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    hasInitialScrolled.current = true;
  }
}, [messages.length]);

// 2단계: message 파라미터가 있으면 해당 메시지로 이동
useEffect(() => {
  if (messageIdFromUrl && messages.length > 0) {
    const targetElement = document.getElementById(`message-${messageIdFromUrl}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 하이라이트 효과
      targetElement.classList.add('ring-2', 'ring-blue-500');
      setTimeout(() => {
        targetElement.classList.remove('ring-2', 'ring-blue-500');
      }, 2000);
    }
  }
}, [messageIdFromUrl, messages.length]);
```

### 파일: `src/components/ChatMessage.tsx`

#### 메시지 클릭 시 URL 업데이트

각 메시지를 클릭하면 URL에 메시지 ID가 추가되어 해당 메시지로 이동할 수 있습니다:

```typescript
const handleMessageClick = () => {
  const conversationId = searchParams.get('conversation');
  const params = new URLSearchParams();
  if (conversationId) {
    params.set('conversation', conversationId);
  }
  params.set('message', message.id);
  navigate(`/?${params.toString()}`);
};

// 메시지에 고유 ID 부여
<div 
  id={`message-${message.id}`}
  onClick={handleMessageClick}
  className="... cursor-pointer hover:border-blue-500/50"
>
```

### 파일: `src/components/ConversationSidebar.tsx`

사이드바에서 대화를 클릭하면 URL이 `/?conversation={id}`로 변경됩니다.

## 사용 방법

### 1. 관리 페이지 접근

1. 채팅 페이지 우측 상단의 설정 아이콘을 클릭합니다
2. 관리 페이지로 이동합니다

### 2. 토큰 사용량 개요 확인

1. 관리 페이지 좌측 사이드바에서 "토큰 사용량" 메뉴를 선택합니다
2. 기본적으로 "개요" 탭이 표시됩니다
3. 통계 카드에서 총 프롬프트 토큰, 완성 토큰, 전체 토큰 수, 사용 횟수, 평균 토큰 수를 확인합니다
4. 바 차트에서 프롬프트 토큰과 완성 토큰을 시각적으로 비교합니다
5. 바에 마우스를 올리면 tooltip으로 상세 정보를 확인할 수 있습니다

### 3. 토큰 사용 내역 목록 조회

1. "목록" 탭을 클릭합니다
2. 페이지네이션을 사용하여 토큰 사용 내역을 확인합니다
3. 각 내역의 날짜, 대화 ID, 프롬프트 토큰, 완성 토큰, 총 토큰을 확인합니다
4. **대화 ID를 클릭하면 해당 대화로 이동합니다**:
   - `messageId`가 있는 경우: 해당 메시지로 자동 스크롤
   - `messageId`가 없는 경우: 대화의 맨 아래로 이동

### 4. 기간별 토큰 사용량 조회

1. "기간별 조회" 탭을 클릭합니다
2. 시작일과 종료일을 선택합니다
3. 선택한 기간의 토큰 사용량이 자동으로 조회됩니다
4. 시간별 라인 차트에서 토큰 사용량 추이를 확인합니다
5. 데이터 포인트에 마우스를 올리면 tooltip으로 상세 정보를 확인할 수 있습니다
6. 해당 기간의 토큰 사용 내역 테이블을 확인합니다

### 5. 자동 저장 확인

- `POST /rag/query` API를 호출할 때마다 토큰 사용량이 자동으로 저장됩니다
- 저장된 데이터는 위의 방법으로 조회할 수 있습니다
- 각 토큰 사용량은 해당 메시지와 1:1로 연결되어 추적 가능합니다

### 6. 대화/메시지 네비게이션

1. **토큰 사용량 테이블에서**:
   - 대화 ID를 클릭하면 해당 대화로 이동합니다
   - `messageId`가 있으면 해당 메시지로 자동 스크롤됩니다

2. **채팅 메시지에서**:
   - 메시지를 클릭하면 URL에 메시지 ID가 추가됩니다
   - URL을 공유하면 특정 메시지로 바로 이동할 수 있습니다

3. **사이드바에서**:
   - 대화를 클릭하면 URL이 `/?conversation={id}`로 변경됩니다
   - URL을 새로고침해도 선택한 대화가 유지됩니다

## 주요 특징

### 1. 모든 사용자 접근 가능

- 관리자 권한 없이도 모든 인증된 사용자가 자신의 토큰 사용량을 조회할 수 있습니다
- 각 사용자는 자신의 토큰 사용량만 조회할 수 있습니다 (서버에서 자동 필터링)

### 2. 다양한 조회 방식

- 개요: 전체 통계 및 시각화
- 목록: 페이지네이션을 지원하는 상세 내역
- 기간별: 특정 기간의 사용량 분석

### 3. 시각화

- D3.js를 사용한 인터랙티브 차트
- Tooltip을 통한 상세 정보 제공
- 애니메이션 효과

### 4. 안전한 API 처리

- 다양한 응답 구조를 안전하게 처리
- 에러 처리 및 로딩 상태 관리
- 빈 데이터 처리

### 5. 메시지 추적 및 네비게이션

- 각 토큰 사용량이 특정 메시지와 1:1로 연결되어 추적 가능
- 토큰 사용량 테이블에서 직접 대화/메시지로 이동
- URL searchParam을 통한 상태 관리로 새로고침 시에도 선택 유지
- 메시지 클릭 시 URL 업데이트로 공유 가능한 링크 생성

## 다음 단계

추가로 구현할 수 있는 기능:

1. **대화별 조회**: 특정 대화의 토큰 사용량을 조회하는 UI 추가
2. **내보내기**: 토큰 사용량 데이터를 CSV 또는 Excel로 내보내기
3. **알림 설정**: 토큰 사용량이 특정 임계값을 초과할 때 알림
4. **예측 분석**: 과거 데이터를 기반으로 향후 토큰 사용량 예측
5. **비용 계산**: 토큰 사용량을 기반으로 비용 계산 및 표시

