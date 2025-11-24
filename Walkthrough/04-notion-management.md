# 04. 노션 관리 기능

관리자 페이지에 노션 페이지를 벡터 DB에 동기화하고 관리하는 기능을 추가합니다.

## 목차

1. [개요](#개요)
2. [OpenAPI 스펙 업데이트](#openapi-스펙-업데이트)
3. [노션 관리 탭 구성](#노션-관리-탭-구성)
4. [페이지 목록 동기화](#페이지-목록-동기화)
5. [벡터 DB 업데이트](#벡터-db-업데이트)
6. [업데이트 중 작업 차단](#업데이트-중-작업-차단)
7. [결과 모달 표시](#결과-모달-표시)
8. [사용 방법](#사용-방법)
9. [API 응답 구조 맞춤](#api-응답-구조-맞춤)

## 개요

이 기능은 관리자 페이지에 노션 페이지를 벡터 DB에 동기화하고 관리하는 기능을 추가합니다:

- **페이지 목록 동기화**: Notion에서 페이지 목록을 가져와 메타데이터만 DB에 저장
- **페이지 목록 조회**: 데이터베이스에 저장된 페이지 목록 조회
- **개별 페이지 업데이트**: 특정 페이지를 벡터 DB에 업데이트
- **일괄 페이지 업데이트**: 선택한 여러 페이지를 한 번에 벡터 DB에 업데이트
- **전체 업데이트**: 전체 데이터베이스의 모든 페이지를 벡터 DB에 업데이트
- **업데이트 중 작업 차단**: 벡터 DB 업데이트 중 다른 작업 방지
- **결과 모달**: 업데이트 완료 후 결과를 모달로 표시

## OpenAPI 스펙 업데이트

백엔드에서 노션 관리 API가 추가되었다면, OpenAPI 스펙을 다시 생성해야 합니다.

### API 생성

```bash
npm run generate:api
```

### 추가된 API 엔드포인트

노션 관리에서 사용하는 주요 API:

1. **페이지 목록 동기화** (관리자 전용)
   - `POST /rag/admin/sync-pages`
   - `ragApi.syncPages({ ingestDto })`
   - Notion에서 페이지 목록을 가져와 메타데이터만 DB에 저장

2. **페이지 목록 조회** (관리자 전용)
   - `GET /rag/admin/pages?databaseId=optional`
   - `ragApi.getPages({ databaseId })`
   - 데이터베이스에 저장된 페이지 목록 조회

3. **특정 페이지 업데이트** (관리자 전용)
   - `POST /rag/admin/update-page`
   - `ragApi.updatePage({ updatePageDto })`
   - 선택한 페이지를 벡터 DB에 업데이트

4. **여러 페이지 일괄 업데이트** (관리자 전용)
   - `POST /rag/admin/update-pages`
   - `ragApi.updatePages({ updatePagesDto })`
   - 여러 페이지를 벡터 DB에 일괄 업데이트

5. **전체 업데이트** (관리자 전용)
   - `POST /rag/admin/update-all`
   - `ragApi.updateAll({ ingestDto })`
   - 전체 데이터베이스의 모든 페이지 업데이트

### 생성된 모델

```typescript
export interface IngestDto {
  databaseId?: string;
}

export interface UpdatePageDto {
  pageId: string;
}

export interface UpdatePagesDto {
  pageIds: Array<string>;
}
```

## 노션 관리 탭 구성

### 파일: `src/components/Admin.tsx`

관리자 페이지에 노션 관리 탭을 추가합니다.

#### 탭 구조

관리자 페이지는 두 개의 탭으로 구성됩니다:
- **사용자 관리**: 사용자 목록 조회 및 권한 관리
- **노션 관리**: Notion 페이지 동기화 및 벡터 DB 업데이트

```typescript
type TabType = 'users' | 'notion';
const [activeTab, setActiveTab] = useState<TabType>('users');
```

#### NotionPage 인터페이스

```typescript
interface NotionPage {
  id: string;
  pageId: string;
  title?: string;
  databaseId?: string;
  url?: string;  // 서버에서 제공하는 노션 페이지 URL
  lastSyncedAt?: string;
  lastUpdatedAt?: string;
  updatedAt?: string;
  syncedAt?: string;
  lastSyncAt?: string;
  createdAt?: string;
  status?: string;
  [key: string]: any; // 추가 필드 허용
}
```

#### 상태 관리

```typescript
// 노션 관리 상태
const [pages, setPages] = useState<NotionPage[]>([]);
const [pageLoading, setPageLoading] = useState(false);
const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
const [databaseId, setDatabaseId] = useState('');
const [syncing, setSyncing] = useState(false);
const [updating, setUpdating] = useState<string | null>(null);
const [updateResult, setUpdateResult] = useState<{
  show: boolean;
  success: boolean;
  message: string;
  count?: number;
} | null>(null);
```

## 페이지 목록 동기화

Notion에서 페이지 목록을 가져와 메타데이터만 DB에 저장합니다.

### 함수 구현

```typescript
const handleSyncPages = async () => {
  try {
    setSyncing(true);
    setError(null);
    await ragApi.syncPages({
      ingestDto: databaseId ? { databaseId } : {},
    });
    await fetchPages(); // 동기화 후 목록 새로고침
  } catch (err: any) {
    console.error('페이지 동기화 실패:', err);
    setError(err.response?.data?.message || '페이지 동기화에 실패했습니다.');
  } finally {
    setSyncing(false);
  }
};
```

### UI 구성

```typescript
<button
  onClick={handleSyncPages}
  disabled={syncing || updating !== null}
  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors"
  title="Notion에서 페이지 목록을 가져와 메타데이터만 DB에 저장합니다. 벡터 DB에는 업데이트하지 않습니다."
>
  {syncing ? '동기화 중...' : 'Notion 목록 가져오기'}
</button>
```

## 벡터 DB 업데이트

### 개별 페이지 업데이트

특정 페이지를 벡터 DB에 업데이트합니다:

```typescript
const handleUpdatePage = async (pageId: string | undefined) => {
  if (!pageId) {
    setError('페이지 ID가 없습니다.');
    return;
  }

  try {
    setUpdating(pageId);
    setError(null);
    const updatePageDto: UpdatePageDto = { pageId: String(pageId) };
    await ragApi.updatePage({ updatePageDto });
    await fetchPages();
    
    // 성공 모달 표시
    setUpdateResult({
      show: true,
      success: true,
      message: '페이지가 벡터 DB에 성공적으로 업데이트되었습니다.',
      count: 1,
    });
  } catch (err: any) {
    console.error('페이지 업데이트 실패:', err);
    const errorMessage = err.response?.data?.message || '페이지 업데이트에 실패했습니다.';
    setError(errorMessage);
    
    // 실패 모달 표시
    setUpdateResult({
      show: true,
      success: false,
      message: errorMessage,
    });
  } finally {
    setUpdating(null);
  }
};
```

### 일괄 페이지 업데이트

선택한 여러 페이지를 한 번에 벡터 DB에 업데이트합니다:

```typescript
const handleUpdatePages = async () => {
  if (selectedPages.size === 0) {
    setError('선택된 페이지가 없습니다.');
    return;
  }

  const pageCount = selectedPages.size;
  try {
    setUpdating('batch');
    setError(null);
    const updatePagesDto: UpdatePagesDto = {
      pageIds: Array.from(selectedPages),
    };
    await ragApi.updatePages({ updatePagesDto });
    setSelectedPages(new Set());
    await fetchPages();
    
    // 성공 모달 표시
    setUpdateResult({
      show: true,
      success: true,
      message: `${pageCount}개의 페이지가 벡터 DB에 성공적으로 업데이트되었습니다.`,
      count: pageCount,
    });
  } catch (err: any) {
    console.error('페이지 일괄 업데이트 실패:', err);
    const errorMessage = err.response?.data?.message || '페이지 일괄 업데이트에 실패했습니다.';
    setError(errorMessage);
    
    // 실패 모달 표시
    setUpdateResult({
      show: true,
      success: false,
      message: errorMessage,
    });
  } finally {
    setUpdating(null);
  }
};
```

### 전체 업데이트

전체 데이터베이스의 모든 페이지를 벡터 DB에 업데이트합니다:

```typescript
const handleUpdateAll = async () => {
  try {
    setUpdating('all');
    setError(null);
    const response = await ragApi.updateAll({
      ingestDto: databaseId ? { databaseId } : {},
    });
    await fetchPages();
    
    // 성공 모달 표시
    const data = (response.data as any);
    const updatedCount = data?.count || data?.updatedCount || pages.length;
    setUpdateResult({
      show: true,
      success: true,
      message: `전체 ${updatedCount}개의 페이지가 벡터 DB에 성공적으로 업데이트되었습니다.`,
      count: updatedCount,
    });
  } catch (err: any) {
    console.error('전체 업데이트 실패:', err);
    const errorMessage = err.response?.data?.message || '전체 업데이트에 실패했습니다.';
    setError(errorMessage);
    
    // 실패 모달 표시
    setUpdateResult({
      show: true,
      success: false,
      message: errorMessage,
    });
  } finally {
    setUpdating(null);
  }
};
```

## 업데이트 중 작업 차단

벡터 DB 업데이트 중에는 다른 작업을 수행할 수 없도록 차단합니다.

### 버튼 비활성화

```typescript
// 업데이트 중일 때 모든 버튼 비활성화
<button
  onClick={handleSyncPages}
  disabled={syncing || updating !== null}  // updating이 null이 아니면 비활성화
  className="..."
>
  {syncing ? '동기화 중...' : 'Notion 목록 가져오기'}
</button>

<button
  onClick={handleUpdateAll}
  disabled={updating !== null}  // 업데이트 중이면 비활성화
  className="..."
>
  {updating === 'all' ? '업데이트 중...' : '전체 벡터 DB 업데이트'}
</button>
```

### 체크박스 비활성화

```typescript
// 전체 선택 체크박스
<input
  type="checkbox"
  checked={selectedPages.size === pages.length && pages.length > 0}
  onChange={toggleSelectAll}
  disabled={updating !== null}  // 업데이트 중이면 비활성화
  className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
/>

// 개별 페이지 체크박스
<input
  type="checkbox"
  checked={selectedPages.has(String(page.pageId || page.id))}
  onChange={() => togglePageSelection(String(page.pageId || page.id))}
  disabled={updating !== null}  // 업데이트 중이면 비활성화
  className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
/>
```

### 경고 메시지 표시

```typescript
{updating !== null && (
  <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
    <p className="text-yellow-300 text-sm">
      ⚠️ 벡터 DB 업데이트가 진행 중입니다. 다른 작업을 수행할 수 없습니다.
    </p>
  </div>
)}
```

## 결과 모달 표시

업데이트 완료 후 결과를 모달로 표시합니다.

### 모달 컴포넌트

```typescript
{updateResult?.show && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
      <div className="flex items-center gap-4 mb-4">
        {updateResult.success ? (
          <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <h3 className={`text-xl font-semibold ${updateResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {updateResult.success ? '업데이트 완료' : '업데이트 실패'}
          </h3>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-slate-300 mb-2">{updateResult.message}</p>
        {updateResult.success && updateResult.count !== undefined && (
          <p className="text-sm text-slate-400">
            업데이트된 페이지 수: <span className="font-semibold text-blue-400">{updateResult.count}개</span>
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setUpdateResult(null)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  </div>
)}
```

## 페이지 목록 조회

데이터베이스에 저장된 페이지 목록을 조회합니다.

### 함수 구현

```typescript
const fetchPages = async () => {
  try {
    setPageLoading(true);
    setError(null);
    const response = await ragApi.getPages({ databaseId: databaseId || '' });
    
    let pageList: NotionPage[] = [];
    const data = (response.data as any);
    
    // 다양한 응답 구조 처리
    if (Array.isArray(data)) {
      pageList = data;
    } else if (data && Array.isArray(data.pages)) {
      pageList = data.pages;
    } else if (data && Array.isArray(data.data)) {
      pageList = data.data;
    } else if (data && typeof data === 'object') {
      const values = Object.values(data);
      if (values.length > 0 && Array.isArray(values[0])) {
        pageList = values[0] as NotionPage[];
      }
    }
    
    setPages(pageList);
  } catch (err: any) {
    console.error('페이지 목록 가져오기 실패:', err);
    setError(err.response?.data?.message || '페이지 목록을 가져오는데 실패했습니다.');
  } finally {
    setPageLoading(false);
  }
};
```

## 페이지 선택 기능

### 개별 선택

```typescript
const togglePageSelection = (pageId: string) => {
  const newSelected = new Set(selectedPages);
  if (newSelected.has(pageId)) {
    newSelected.delete(pageId);
  } else {
    newSelected.add(pageId);
  }
  setSelectedPages(newSelected);
};
```

### 전체 선택/해제

```typescript
const toggleSelectAll = () => {
  if (selectedPages.size === pages.length) {
    setSelectedPages(new Set());
  } else {
    setSelectedPages(new Set(pages.map(p => String(p.pageId || p.id))));
  }
};
```

## 날짜 포맷팅

한국 시간(KST)으로 날짜를 표시합니다.

### 함수 구현

```typescript
const formatToKST = (dateValue: string | undefined): string => {
  if (!dateValue) return '-';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    
    // Intl.DateTimeFormat을 사용하여 한국 시간대로 명시적으로 변환
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    
    return formatter.format(date);
  } catch (e) {
    return dateValue;
  }
};
```

### 사용

```typescript
<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
  {formatToKST(
    // 벡터 DB 업데이트 날짜를 우선적으로 표시
    page.updatedAt || 
    page.lastUpdatedAt || 
    // 동기화 날짜는 fallback
    page.lastSyncedAt || 
    page.syncedAt || 
    page.lastSyncAt ||
    page.createdAt
  )}
</td>
```

## 노션 페이지 링크

서버에서 제공하는 URL을 사용하여 노션 페이지로 이동할 수 있습니다.

### URL 생성 함수

```typescript
const getNotionPageUrl = (page: NotionPage): string => {
  // 서버에서 제공하는 URL이 있으면 사용
  if (page.url) {
    return page.url;
  }
  
  // URL이 없으면 pageId로 생성 (fallback)
  const pageId = page.pageId || page.id;
  let formattedPageId = pageId;
  
  // 하이픈이 없는 32자리 UUID인 경우 하이픈 추가
  if (pageId.length === 32 && !pageId.includes('-')) {
    formattedPageId = `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20, 32)}`;
  }
  
  return `https://www.notion.so/${formattedPageId}`;
};
```

### 링크 적용

```typescript
<td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
  <a
    href={getNotionPageUrl(page)}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
    onClick={(e) => e.stopPropagation()}
  >
    {page.pageId || page.id}
  </a>
</td>
<td className="px-6 py-4 whitespace-nowrap text-sm">
  <a
    href={getNotionPageUrl(page)}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
    onClick={(e) => e.stopPropagation()}
  >
    {page.title || '-'}
  </a>
</td>
```

## 사용 방법

### 페이지 목록 동기화

1. 노션 관리 탭으로 이동
2. (선택사항) 데이터베이스 ID 입력
3. "Notion 목록 가져오기" 버튼 클릭
4. Notion에서 페이지 목록을 가져와 DB에 저장

### 개별 페이지 업데이트

1. 페이지 목록에서 업데이트할 페이지의 "벡터 DB 업데이트" 버튼 클릭
2. 해당 페이지가 벡터 DB에 업데이트됨
3. 완료 후 결과 모달 표시

### 일괄 페이지 업데이트

1. 페이지 목록에서 업데이트할 페이지들을 체크박스로 선택
2. "선택한 N개 벡터 DB 업데이트" 버튼 클릭
3. 선택한 모든 페이지가 벡터 DB에 업데이트됨
4. 완료 후 결과 모달에 업데이트된 페이지 수 표시

### 전체 업데이트

1. "전체 벡터 DB 업데이트" 버튼 클릭
2. 데이터베이스의 모든 페이지가 벡터 DB에 업데이트됨
3. 완료 후 결과 모달에 업데이트된 페이지 수 표시

### 노션 문서로 이동

- 페이지 ID나 제목을 클릭하면 해당 노션 문서가 새 탭에서 열림
- 서버에서 제공하는 URL을 사용하거나, pageId로 자동 생성

## API 응답 구조 맞춤

실제 백엔드 API 응답 구조에 맞게 다음 부분들을 수정해야 할 수 있습니다.

### 1. 페이지 목록 응답 처리

**파일**: `src/components/Admin.tsx` (fetchPages 함수)

```typescript
const response = await ragApi.getPages({ databaseId: databaseId || '' });

// 실제 API 응답 구조에 맞게 수정
// 예시 1: 직접 배열
// response.data = [{ id: '1', pageId: 'abc-123', title: '페이지 제목', url: 'https://...' }, ...]

// 예시 2: 객체로 래핑
// response.data = { pages: [{ id: '1', pageId: 'abc-123', ... }, ...] }

// 예시 3: data 속성으로 래핑
// response.data = { data: [{ id: '1', pageId: 'abc-123', ... }, ...] }
```

### 2. 업데이트 결과 응답 처리

**파일**: `src/components/Admin.tsx` (handleUpdateAll 함수)

```typescript
const response = await ragApi.updateAll({
  ingestDto: databaseId ? { databaseId } : {},
});

// 실제 API 응답 구조에 맞게 수정
const data = (response.data as any);
const updatedCount = data?.count || data?.updatedCount || data?.total || pages.length;
```

### 3. 노션 페이지 날짜 필드

**파일**: `src/components/Admin.tsx` (formatToKST 함수 사용 부분)

서버에서 제공하는 날짜 필드명이 다를 수 있습니다:

```typescript
// 다양한 날짜 필드명 확인
const dateValue = page.updatedAt ||      // 벡터 DB 업데이트 날짜 (우선)
                 page.lastUpdatedAt ||   // 마지막 업데이트 날짜
                 page.lastSyncedAt ||    // 동기화 날짜 (fallback)
                 page.syncedAt || 
                 page.lastSyncAt ||
                 page.createdAt;
```

실제 API 응답의 필드명에 맞게 수정하세요.

## 파일 구조

```
src/
├── components/
│   └── Admin.tsx                 # 관리자 페이지 (노션 관리 탭 포함)
├── api/
│   ├── client.ts
│   └── generated/                # OpenAPI 생성 파일
│       ├── api/
│       │   └── ragapi.ts         # 노션 관리 API
│       └── models/
│           ├── update-page-dto.ts     # UpdatePageDto 모델
│           ├── update-pages-dto.ts    # UpdatePagesDto 모델
│           └── ingest-dto.ts         # IngestDto 모델
```

## 주의사항

1. **업데이트 중 작업 차단**: 벡터 DB 업데이트 중에는 다른 작업을 수행할 수 없습니다.
2. **API 응답 구조**: 실제 백엔드 API 응답 구조에 맞게 파싱 로직을 수정해야 합니다.
3. **에러 처리**: 권한이 없는 사용자가 API를 호출하면 403 에러가 발생할 수 있으므로 적절히 처리해야 합니다.
4. **날짜 필드**: 서버에서 보내는 날짜 필드명이 다를 수 있으므로 확인이 필요합니다.
5. **pageId 형식**: `pageId`는 문자열이어야 하며, 필요시 `String()`으로 변환해야 합니다.

## 트러블슈팅

### 페이지 목록이 표시되지 않는 문제

**원인**: API 응답 구조가 코드와 일치하지 않음

**해결 방법**:
- 브라우저 개발자 도구에서 실제 API 응답 확인
- `Admin.tsx`의 `fetchPages` 함수에서 응답 구조에 맞게 파싱 로직 수정

### 페이지 업데이트 실패

**원인**: `pageId`가 문자열이 아니거나 형식이 잘못됨

**해결 방법**:
- `pageId`를 `String()`으로 명시적으로 변환
- API 응답에서 `pageId` 필드명 확인
- `page.pageId` 또는 `page.id` 중 올바른 필드 사용

### 날짜가 한국 시간으로 표시되지 않는 문제

**원인**: 서버에서 UTC 시간을 보내고 클라이언트에서 변환하지 않음

**해결 방법**:
- `formatToKST` 함수에서 `Intl.DateTimeFormat` 사용
- `timeZone: 'Asia/Seoul'` 옵션 확인
- 서버에서 보내는 날짜 형식 확인

### 업데이트 중에도 다른 작업이 가능한 문제

**원인**: `updating` 상태가 제대로 관리되지 않음

**해결 방법**:
- 모든 버튼과 체크박스에 `disabled={updating !== null}` 추가
- 업데이트 시작 시 `setUpdating()` 호출 확인
- 업데이트 완료 시 `setUpdating(null)` 호출 확인

### 결과 모달이 표시되지 않는 문제

**원인**: `updateResult` 상태가 제대로 설정되지 않음

**해결 방법**:
- 업데이트 함수에서 성공/실패 시 `setUpdateResult()` 호출 확인
- 모달 조건부 렌더링 `{updateResult?.show && ...}` 확인

## 참고 자료

- [React Router 문서](https://reactrouter.com/)
- [OpenAPI Generator 문서](https://openapi-generator.tech/)
- [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [Notion API 문서](https://developers.notion.com/)

