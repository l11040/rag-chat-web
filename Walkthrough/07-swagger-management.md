# 07. Swagger 문서 관리 기능

관리자 페이지에 Swagger 문서를 업로드하고 관리하는 기능을 추가합니다.

## 목차

1. [개요](#개요)
2. [OpenAPI 스펙 업데이트](#openapi-스펙-업데이트)
3. [Swagger 관리 탭 구성](#swagger-관리-탭-구성)
4. [Swagger 문서 업로드](#swagger-문서-업로드)
5. [Swagger 문서 목록 조회](#swagger-문서-목록-조회)
6. [Swagger 문서 삭제](#swagger-문서-삭제)
7. [사용 방법](#사용-방법)
8. [API 응답 구조 맞춤](#api-응답-구조-맞춤)

## 개요

이 기능은 관리자 페이지에 Swagger 문서를 벡터 DB에 업로드하고 관리하는 기능을 추가합니다:

- **Swagger 문서 업로드**: Swagger JSON URL을 입력받아 API 정보를 벡터 DB에 저장
- **문서 목록 조회**: 업로드된 모든 Swagger 문서의 메타데이터 조회
- **문서 상세 조회**: 특정 Swagger 문서의 상세 정보 조회
- **문서 삭제**: Swagger 문서와 관련된 모든 벡터 데이터 삭제
- **중복 키 처리**: 같은 키가 이미 존재하면 기존 데이터를 삭제하고 재업로드

## OpenAPI 스펙 업데이트

백엔드에서 Swagger 관리 API가 추가되었다면, OpenAPI 스펙을 다시 생성해야 합니다.

### API 생성

```bash
npm run generate:api
```

### 추가된 API 엔드포인트

Swagger 관리에서 사용하는 주요 API:

1. **Swagger 문서 업로드** (관리자 전용)
   - `POST /swagger/upload`
   - `swaggerApi.uploadSwaggerDocument({ uploadSwaggerDto })`
   - Swagger JSON URL을 입력받아 API 정보를 벡터 DB에 저장
   - 같은 키가 이미 존재하면 기존 데이터를 삭제하고 재업로드

2. **Swagger 문서 목록 조회** (관리자 전용)
   - `GET /swagger/documents`
   - `swaggerApi.getSwaggerDocuments()`
   - 업로드된 모든 Swagger 문서의 메타데이터 조회

3. **특정 Swagger 문서 조회** (관리자 전용)
   - `GET /swagger/documents/:id`
   - `swaggerApi.getSwaggerDocument({ id })`
   - 특정 Swagger 문서의 상세 정보 조회

4. **Swagger 문서 삭제** (관리자 전용)
   - `DELETE /swagger/documents/:id`
   - `swaggerApi.deleteSwaggerDocument({ id })`
   - Swagger 문서와 관련된 모든 벡터 데이터를 Qdrant에서 삭제

### 생성된 모델

```typescript
export interface UploadSwaggerDto {
  /**
   * Swagger 문서 고유 키 (영어, 숫자, 소문자, 언더스코어만 허용)
   */
  key: string;
  /**
   * Swagger JSON URL (예: http://localhost:3001/api-json)
   */
  swaggerUrl: string;
}
```

### API 클라이언트 추가

`src/api/client.ts`에 `SwaggerApi`를 추가합니다:

```typescript
import { SwaggerApi } from './generated';

export const swaggerApi = new SwaggerApi(configuration, API_BASE_URL, axiosInstance);
```

## Swagger 관리 탭 구성

### 파일: `src/components/Admin.tsx`

관리자 페이지에 Swagger 관리 탭을 추가합니다.

#### 탭 구조

관리자 페이지는 세 개의 탭으로 구성됩니다:
- **사용자 관리**: 사용자 목록 조회 및 권한 관리
- **노션 관리**: Notion 페이지 동기화 및 벡터 DB 업데이트
- **Swagger 관리**: Swagger 문서 업로드 및 관리

```typescript
type TabType = 'users' | 'notion' | 'swagger';
const [activeTab, setActiveTab] = useState<TabType>('users');
```

#### 상태 관리

Swagger 관리를 위한 상태를 추가합니다:

```typescript
interface SwaggerDocument {
  id: string;
  key: string;
  swaggerUrl: string;
  createdAt?: string;
  updatedAt?: string;
  apiCount?: number;
  [key: string]: any;
}

// Swagger 관리 상태
const [swaggerDocuments, setSwaggerDocuments] = useState<SwaggerDocument[]>([]);
const [swaggerLoading, setSwaggerLoading] = useState(false);
const [uploading, setUploading] = useState(false);
const [deleting, setDeleting] = useState<string | null>(null);
const [uploadForm, setUploadForm] = useState<UploadSwaggerDto>({
  key: '',
  swaggerUrl: '',
});
```

#### 탭 UI 추가

탭 메뉴에 Swagger 관리 탭 버튼을 추가합니다. 노션 관리 탭과 동일한 스타일을 사용합니다.

## Swagger 문서 업로드

### 업로드 폼 구성

노션 관리와 유사한 디자인으로 업로드 폼을 구성합니다. 다음 필드들을 포함합니다:

- **문서 키 입력 필드**: 영어, 숫자, 소문자, 언더스코어만 허용
- **Swagger JSON URL 입력 필드**: OpenAPI 스펙 URL 입력
- **업로드 버튼**: 업로드 중 상태 표시 및 비활성화
- **목록 새로고침 버튼**: 문서 목록 갱신

### 업로드 함수 구현

```typescript
const handleUploadSwagger = async () => {
  if (!uploadForm.key || !uploadForm.swaggerUrl) {
    setError('키와 Swagger URL을 모두 입력해주세요.');
    return;
  }

  try {
    setUploading(true);
    setError(null);
    await swaggerApi.uploadSwaggerDocument({
      uploadSwaggerDto: uploadForm,
    });
    
    setUploadForm({ key: '', swaggerUrl: '' });
    await fetchSwaggerDocuments();
    
    setUpdateResult({
      show: true,
      success: true,
      message: 'Swagger 문서가 성공적으로 업로드되었습니다.',
    });
  } catch (err: any) {
    console.error('Swagger 문서 업로드 실패:', err);
    const errorMessage = err.response?.data?.message || 'Swagger 문서 업로드에 실패했습니다.';
    setError(errorMessage);
    
    setUpdateResult({
      show: true,
      success: false,
      message: errorMessage,
    });
  } finally {
    setUploading(false);
  }
};
```

### 주요 기능

- **입력 검증**: 키와 URL이 모두 입력되었는지 확인
- **로딩 상태**: 업로드 중 버튼 비활성화 및 로딩 표시
- **에러 처리**: 업로드 실패 시 에러 메시지 표시
- **성공 모달**: 업로드 완료 후 결과 모달 표시
- **폼 초기화**: 업로드 성공 후 폼 초기화

## Swagger 문서 목록 조회

### 목록 조회 함수

```typescript
const fetchSwaggerDocuments = async () => {
  try {
    setSwaggerLoading(true);
    setError(null);
    const response = await swaggerApi.getSwaggerDocuments();
    
    const data = (response.data as any);
    let documentList: SwaggerDocument[] = [];
    
    if (data && data.success && Array.isArray(data.documents)) {
      documentList = data.documents;
    } else if (Array.isArray(data)) {
      documentList = data;
    } else if (data && Array.isArray(data.data)) {
      documentList = data.data;
    }
    
    setSwaggerDocuments(documentList);
  } catch (err: any) {
    console.error('Swagger 문서 목록 가져오기 실패:', err);
    setError(err.response?.data?.message || 'Swagger 문서 목록을 가져오는데 실패했습니다.');
  } finally {
    setSwaggerLoading(false);
  }
};
```

### 목록 UI 구성

노션 관리와 유사한 테이블 형식으로 목록을 표시합니다. 다음 컬럼들을 포함합니다:

- **문서 ID**: Swagger 문서의 고유 ID
- **키**: 사용자가 지정한 문서 키
- **Swagger URL**: 업로드된 Swagger JSON URL (클릭 가능한 링크)
- **API 개수**: 벡터 DB에 저장된 API 엔드포인트 개수
- **생성일**: 문서가 업로드된 날짜 (한국 시간으로 표시)
- **작업**: 삭제 버튼

로딩 상태와 빈 목록 상태도 적절히 처리합니다.


## Swagger 문서 삭제

### 삭제 함수 구현

```typescript
const handleDeleteSwagger = async (id: string) => {
  if (!confirm('이 Swagger 문서를 삭제하시겠습니까? 관련된 모든 벡터 데이터가 삭제됩니다.')) {
    return;
  }

  try {
    setDeleting(id);
    setError(null);
    await swaggerApi.deleteSwaggerDocument({ id });
    await fetchSwaggerDocuments();
    
    setUpdateResult({
      show: true,
      success: true,
      message: 'Swagger 문서가 성공적으로 삭제되었습니다.',
    });
  } catch (err: any) {
    console.error('Swagger 문서 삭제 실패:', err);
    const errorMessage = err.response?.data?.message || 'Swagger 문서 삭제에 실패했습니다.';
    setError(errorMessage);
    
    setUpdateResult({
      show: true,
      success: false,
      message: errorMessage,
    });
  } finally {
    setDeleting(null);
  }
};
```

### 주요 기능

- **확인 다이얼로그**: 삭제 전 확인 메시지 표시
- **로딩 상태**: 삭제 중 버튼 비활성화 및 로딩 표시
- **에러 처리**: 삭제 실패 시 에러 메시지 표시
- **성공 모달**: 삭제 완료 후 결과 모달 표시
- **목록 갱신**: 삭제 성공 후 목록 자동 갱신

## 사용 방법

### 1. Swagger 문서 업로드

1. 관리자 페이지에 접속합니다.
2. **Swagger 관리** 탭을 클릭합니다.
3. **문서 키**를 입력합니다 (예: `my-api-docs`)
   - 영어, 숫자, 소문자, 언더스코어만 허용
   - 같은 키가 이미 존재하면 기존 데이터를 삭제하고 재업로드됩니다.
4. **Swagger JSON URL**을 입력합니다 (예: `http://localhost:3001/api-json`)
   - Swagger JSON 형식의 OpenAPI 스펙 URL
5. **Swagger 문서 업로드** 버튼을 클릭합니다.
6. 업로드가 완료되면 결과 모달이 표시됩니다.

### 2. Swagger 문서 목록 조회

1. **Swagger 관리** 탭에서 자동으로 목록이 표시됩니다.
2. **목록 새로고침** 버튼을 클릭하여 목록을 갱신할 수 있습니다.
3. 각 문서의 정보를 확인할 수 있습니다:
   - 문서 ID
   - 키
   - Swagger URL (클릭하여 확인 가능)
   - API 개수
   - 생성일

### 3. Swagger 문서 삭제

1. 목록에서 삭제할 문서의 **삭제** 버튼을 클릭합니다.
2. 확인 다이얼로그에서 **확인**을 클릭합니다.
3. 삭제가 완료되면 결과 모달이 표시되고 목록이 자동으로 갱신됩니다.

## API 응답 구조 맞춤

Swagger API의 응답 구조가 다양할 수 있으므로, 여러 형식을 지원하도록 구현했습니다.

### 문서 목록 조회 응답

다음과 같은 응답 형식을 모두 지원합니다:

```typescript
// 형식 1: success와 documents를 포함한 객체
{
  success: true,
  documents: [...],
  total: number
}

// 형식 2: 배열 직접 반환
[...]

// 형식 3: data 속성에 배열
{
  data: [...]
}
```

### 문서 상세 조회 응답

```typescript
// 성공 응답
{
  success: true,
  document: {...}
}

// 실패 응답
{
  success: false,
  message: "..."
}
```

### 삭제 응답

```typescript
{
  success: true,
  message: "...",
  deletedApis: number
}
```

## 디자인 특징

Swagger 관리 기능은 노션 관리 기능과 유사한 디자인으로 구현되었습니다:

- **일관된 UI**: 노션 관리와 동일한 색상 및 레이아웃
- **반응형 디자인**: 테이블이 화면 크기에 맞게 스크롤 가능
- **로딩 상태**: 모든 비동기 작업에 로딩 표시
- **에러 처리**: 명확한 에러 메시지 표시
- **결과 모달**: 작업 완료 후 결과를 모달로 표시
- **사용자 경험**: 직관적인 인터페이스와 명확한 안내 메시지

## 주의사항

1. **키 중복**: 같은 키로 업로드하면 기존 데이터가 삭제되고 재업로드됩니다.
2. **URL 유효성**: Swagger JSON URL이 유효한지 확인해야 합니다.
3. **벡터 DB 저장**: 업로드된 Swagger 문서는 벡터 DB에 저장되어 RAG 검색에 활용됩니다.
4. **삭제 주의**: 문서를 삭제하면 관련된 모든 벡터 데이터가 삭제됩니다.
5. **권한**: 관리자(admin) 및 서브 관리자(sub_admin)만 접근 가능합니다.

## 다음 단계

Swagger 문서 관리 기능이 완료되었습니다. 이제 다음 기능을 추가할 수 있습니다:

- Swagger 문서 상세 조회 기능
- Swagger 문서 수정 기능
- 벡터 DB 동기화 상태 확인
- API 엔드포인트별 상세 정보 표시

