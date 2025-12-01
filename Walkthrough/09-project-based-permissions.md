# 09. 프로젝트 기반 권한 관리 시스템

프로젝트 단위로 문서와 멤버를 관리하고, 프로젝트별로 RAG 검색을 수행할 수 있는 권한 관리 시스템을 구축합니다.

## 목차

1. [개요](#개요)
2. [API 엔드포인트](#api-엔드포인트)
3. [OpenAPI 스펙 업데이트](#openapi-스펙-업데이트)
4. [프로젝트 관리 API 클라이언트](#프로젝트-관리-api-클라이언트)
5. [관리자 페이지에 프로젝트 생성 기능 추가](#관리자-페이지에-프로젝트-생성-기능-추가)
6. [설정 페이지에 프로젝트 관리 기능 추가](#설정-페이지에-프로젝트-관리-기능-추가)
7. [채팅 화면에 프로젝트 선택 기능 추가](#채팅-화면에-프로젝트-선택-기능-추가)
8. [권한별 기능 분기](#권한별-기능-분기)
9. [사용 방법](#사용-방법)

## 개요

이 프로젝트는 다음과 같은 프로젝트 기반 권한 관리 기능을 제공합니다:

- **프로젝트 생성**: 서브 관리자/관리자만 프로젝트 생성 가능
- **프로젝트 관리**: 프로젝트 정보 수정 및 삭제 (프로젝트 관리자만)
- **멤버 관리**: 프로젝트에 멤버 추가, 역할 변경, 제거 (프로젝트 관리자만)
- **문서 관리**: Notion 페이지 및 Swagger 문서 추가/제거 (프로젝트 관리자만)
- **프로젝트별 검색**: 선택한 프로젝트의 문서만 검색
- **권한 기반 접근 제어**: 프로젝트 관리자와 일반 멤버의 기능 분리

### 권한 구조

```typescript
// 프로젝트 멤버 역할
type ProjectMemberRole = 'member' | 'project_manager';

// 프로젝트 관리자: 프로젝트 수정/삭제, 멤버 관리, 문서 관리 가능
// 일반 멤버: 프로젝트 정보, 멤버 목록, 문서 목록 조회만 가능
```

## API 엔드포인트

### 프로젝트 관리 API

#### `POST /projects`
프로젝트 생성 (서브 관리자/관리자만)

**요청 본문:**
```json
{
  "name": "프로젝트 이름",
  "description": "프로젝트 설명 (선택사항)"
}
```

**응답:**
```json
{
  "id": "project-id",
  "name": "프로젝트 이름",
  "description": "프로젝트 설명",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

#### `GET /projects`
내 프로젝트 목록 조회 (인증된 사용자)

**응답:**
```json
[
  {
    "id": "project-id",
    "name": "프로젝트 이름",
    "description": "프로젝트 설명",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

#### `GET /projects/:projectId`
프로젝트 상세 조회 (프로젝트 멤버만)

**응답:**
```json
{
  "id": "project-id",
  "name": "프로젝트 이름",
  "description": "프로젝트 설명",
  "members": [
    {
      "id": "member-id",
      "userId": "user-id",
      "role": "project_manager",
      "user": {
        "id": "user-id",
        "email": "user@example.com"
      }
    }
  ],
  "notionPages": [...],
  "swaggerDocuments": [...],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

#### `PUT /projects/:projectId`
프로젝트 수정 (프로젝트 관리자만)

**요청 본문:**
```json
{
  "name": "수정된 프로젝트 이름",
  "description": "수정된 프로젝트 설명"
}
```

#### `DELETE /projects/:projectId`
프로젝트 삭제 (프로젝트 관리자만)

**응답:**
```json
{
  "message": "프로젝트가 삭제되었습니다."
}
```

### 멤버 관리 API

#### `GET /projects/:projectId/members`
프로젝트 멤버 목록 조회 (프로젝트 멤버만)

**응답:**
```json
[
  {
    "id": "member-id",
    "userId": "user-id",
    "role": "project_manager",
    "user": {
      "id": "user-id",
      "email": "user@example.com"
    }
  }
]
```

#### `POST /projects/:projectId/members`
프로젝트에 멤버 추가 (프로젝트 관리자만)

**요청 본문:**
```json
{
  "userId": "user-id",
  "role": "member" | "project_manager"
}
```

#### `PUT /projects/:projectId/members/:userId`
멤버 역할 변경 (프로젝트 관리자만)

**요청 본문:**
```json
{
  "role": "member" | "project_manager"
}
```

#### `DELETE /projects/:projectId/members/:userId`
프로젝트에서 멤버 제거 (프로젝트 관리자만)

**응답:**
```json
{
  "message": "멤버가 제거되었습니다."
}
```

### 문서 관리 API

#### `GET /projects/selectable/notion-pages`
프로젝트에 추가 가능한 Notion 페이지 목록 조회 (인증된 사용자)

**응답:**
```json
[
  {
    "id": "page-id",
    "pageId": "notion-page-id",
    "title": "페이지 제목",
    "databaseId": "database-id",
    "url": "https://notion.so/..."
  }
]
```

#### `POST /projects/:projectId/notion-pages`
프로젝트에 Notion 페이지 추가 (프로젝트 관리자만)

**요청 본문:**
```json
{
  "notionPageIds": ["page-id-1", "page-id-2"]
}
```

#### `DELETE /projects/:projectId/notion-pages/:notionPageId`
프로젝트에서 Notion 페이지 제거 (프로젝트 관리자만)

**응답:**
```json
{
  "message": "Notion 페이지가 제거되었습니다."
}
```

#### `GET /projects/selectable/swagger-documents`
프로젝트에 추가 가능한 Swagger 문서 목록 조회 (인증된 사용자)

**응답:**
```json
[
  {
    "id": "doc-id",
    "key": "swagger-key",
    "swaggerUrl": "https://api.example.com/swagger.json"
  }
]
```

#### `POST /projects/:projectId/swagger-documents`
프로젝트에 Swagger 문서 추가 (프로젝트 관리자만)

**요청 본문:**
```json
{
  "swaggerDocumentIds": ["doc-id-1", "doc-id-2"]
}
```

#### `DELETE /projects/:projectId/swagger-documents/:swaggerDocumentId`
프로젝트에서 Swagger 문서 제거 (프로젝트 관리자만)

**응답:**
```json
{
  "message": "Swagger 문서가 제거되었습니다."
}
```

### 사용자 조회 API

#### `GET /auth/users`
모든 사용자 목록 조회 (서브 관리자/관리자만)

**응답:**
```json
[
  {
    "id": "user-id",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### RAG 쿼리 API (수정됨)

#### `POST /rag/query`
질문에 대한 답변 생성 (projectId 파라미터 추가)

**요청 본문:**
```json
{
  "question": "질문 내용",
  "projectId": "project-id (선택사항)",
  "conversationId": "conversation-id (선택사항)",
  "conversationHistory": [...]
}
```

**응답:**
```json
{
  "success": true,
  "answer": "답변 내용",
  "sources": [...],
  "conversationId": "conversation-id",
  "rewrittenQuery": "...",
  "usage": {...}
}
```

## OpenAPI 스펙 업데이트

백엔드에서 프로젝트 관련 API가 추가되었다면, OpenAPI 스펙을 다시 생성해야 합니다.

### API 생성

```bash
npm run generate:api
```

### 생성된 모델

다음과 같은 모델들이 생성됩니다:

```typescript
// 프로젝트 생성
export interface CreateProjectDto {
  name: string;
  description?: string;
}

// 프로젝트 수정
export interface UpdateProjectDto {
  name?: string;
  description?: string;
}

// 멤버 추가
export interface AddMemberDto {
  userId: string;
  role: 'member' | 'project_manager';
}

// 멤버 역할 변경
export interface UpdateMemberRoleDto {
  role: 'member' | 'project_manager';
}

// Notion 페이지 추가
export interface AddNotionPagesDto {
  notionPageIds: string[];
}

// Swagger 문서 추가
export interface AddSwaggerDocumentsDto {
  swaggerDocumentIds: string[];
}
```

## 프로젝트 관리 API 클라이언트

### 파일: `src/api/projects.ts`

프로젝트 관리 관련 API 호출을 위한 React Query 훅들을 제공합니다.

#### 주요 훅

```typescript
// 프로젝트 목록 조회
export function useProjects(): UseQueryResult<Project[]>

// 프로젝트 상세 조회
export function useProject(projectId: string | null): UseQueryResult<ProjectDetail>

// 프로젝트 멤버 목록 조회
export function useProjectMembers(projectId: string | null): UseQueryResult<ProjectMember[]>

// 추가 가능한 Notion 페이지 목록 조회
export function useSelectableNotionPages(): UseQueryResult<SelectableNotionPage[]>

// 추가 가능한 Swagger 문서 목록 조회
export function useSelectableSwaggerDocuments(): UseQueryResult<SelectableSwaggerDocument[]>

// 프로젝트 생성 (서브 관리자/관리자만)
export function useCreateProject(): UseMutationResult<Project, Error, CreateProjectDto>

// 프로젝트 수정 (프로젝트 관리자만)
export function useUpdateProject(): UseMutationResult<void, Error, { projectId: string; data: UpdateProjectDto }>

// 프로젝트 삭제 (프로젝트 관리자만)
export function useDeleteProject(): UseMutationResult<void, Error, string>

// 멤버 추가 (프로젝트 관리자만)
export function useAddProjectMember(): UseMutationResult<void, Error, { projectId: string; data: AddMemberDto }>

// 멤버 역할 변경 (프로젝트 관리자만)
export function useUpdateProjectMemberRole(): UseMutationResult<void, Error, { projectId: string; userId: string; data: UpdateMemberRoleDto }>

// 멤버 제거 (프로젝트 관리자만)
export function useRemoveProjectMember(): UseMutationResult<void, Error, { projectId: string; userId: string }>

// Notion 페이지 추가 (프로젝트 관리자만)
export function useAddProjectNotionPages(): UseMutationResult<void, Error, { projectId: string; data: AddNotionPagesDto }>

// Notion 페이지 제거 (프로젝트 관리자만)
export function useRemoveProjectNotionPage(): UseMutationResult<void, Error, { projectId: string; notionPageId: string }>

// Swagger 문서 추가 (프로젝트 관리자만)
export function useAddProjectSwaggerDocuments(): UseMutationResult<void, Error, { projectId: string; data: AddSwaggerDocumentsDto }>

// Swagger 문서 제거 (프로젝트 관리자만)
export function useRemoveProjectSwaggerDocument(): UseMutationResult<void, Error, { projectId: string; swaggerDocumentId: string }>
```

#### 타입 정의

```typescript
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  notionPages: any[];
  swaggerDocuments: any[];
}

export interface ProjectMember {
  id: string;
  userId: string;
  role: 'member' | 'project_manager';
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface SelectableNotionPage {
  id: string;
  pageId: string;
  title?: string;
  databaseId?: string;
  url?: string;
  [key: string]: any;
}

export interface SelectableSwaggerDocument {
  id: string;
  key: string;
  swaggerUrl?: string;
  [key: string]: any;
}
```

### 파일: `src/api/users.ts`

사용자 목록 조회를 위한 훅을 제공합니다.

```typescript
// 모든 사용자 목록 조회 (서브 관리자/관리자만)
export function useUsers(): UseQueryResult<User[]>
```

### 파일: `src/api/client.ts`

프로젝트 API 클라이언트를 추가합니다.

```typescript
import { ProjectsApi } from './generated';

export const projectsApi = new ProjectsApi(configuration, API_BASE_URL, axiosInstance);
```

## 관리자 페이지에 프로젝트 생성 기능 추가

### 파일: `src/components/Admin.tsx`

관리자 페이지에 프로젝트 생성 탭을 추가합니다.

#### 탭 추가

```typescript
type TabType = 'users' | 'notion' | 'swagger' | 'projects';
```

#### 프로젝트 생성 폼

```typescript
import { useCreateProject } from '../api/projects';

const [projectForm, setProjectForm] = useState<CreateProjectDto>({
  name: '',
  description: '',
});
const createProjectMutation = useCreateProject();

// 프로젝트 생성 핸들러
const handleCreateProject = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await createProjectMutation.mutateAsync(projectForm);
    setProjectForm({ name: '', description: '' });
    alert('프로젝트가 생성되었습니다.');
  } catch (error) {
    console.error('프로젝트 생성 실패:', error);
    alert('프로젝트 생성에 실패했습니다.');
  }
};
```

#### UI 구성

```tsx
{activeTab === 'projects' && (
  <div className="bg-slate-800 rounded-lg shadow-lg p-6">
    <h2 className="text-xl font-semibold mb-6">프로젝트 생성</h2>
    <form onSubmit={handleCreateProject} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          프로젝트 이름 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={projectForm.name}
          onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
          required
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          프로젝트 설명
        </label>
        <textarea
          value={projectForm.description || ''}
          onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        />
      </div>
      <button
        type="submit"
        disabled={createProjectMutation.isPending}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
      >
        프로젝트 생성
      </button>
    </form>
  </div>
)}
```

## 설정 페이지에 프로젝트 관리 기능 추가

### 파일: `src/components/Management.tsx`

설정 페이지에 프로젝트 관리 메뉴를 추가합니다.

#### 메뉴 추가

```typescript
type MenuType = 'token-usage' | 'projects';

const menuItems: MenuItem[] = [
  {
    id: 'token-usage',
    label: '토큰 사용량',
    icon: <ChartIcon />
  },
  {
    id: 'projects',
    label: '프로젝트 관리',
    icon: <ProjectIcon />
  }
];
```

#### Projects 컴포넌트 통합

```tsx
import { Projects } from './Projects';

{activeMenu === 'projects' && <Projects />}
```

### 파일: `src/components/Projects.tsx`

프로젝트 관리 컴포넌트를 구현합니다.

#### 주요 기능

1. **프로젝트 목록 표시**
   - 사용자가 참여한 프로젝트 목록 표시
   - 프로젝트 선택 시 상세 정보 표시

2. **프로젝트 정보 관리** (프로젝트 관리자만)
   - 프로젝트 이름 및 설명 수정
   - 프로젝트 삭제

3. **멤버 관리** (프로젝트 관리자만)
   - 멤버 추가 (사용자 선택 드롭다운)
   - 멤버 역할 변경
   - 멤버 제거

4. **문서 관리** (프로젝트 관리자만)
   - Notion 페이지 추가 (선택 가능한 페이지 목록)
   - Notion 페이지 제거
   - Swagger 문서 추가 (선택 가능한 문서 목록)
   - Swagger 문서 제거

5. **조회 전용 기능** (일반 멤버)
   - 프로젝트 정보 조회
   - 멤버 목록 조회
   - 문서 목록 조회

#### 권한 확인

```typescript
const { user } = useAuth();
const { data: members } = useProjectMembers(selectedProjectId);

// 현재 사용자가 프로젝트 관리자인지 확인
const currentUserMember = members?.find((m) => m.userId === user?.id);
const isProjectManager = currentUserMember?.role === 'project_manager';
const isMember = currentUserMember !== undefined;
```

#### 멤버 추가 모달

```tsx
{showAddMemberModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
      <h3 className="text-xl font-semibold text-white mb-4">멤버 추가</h3>
      <form onSubmit={handleAddMember} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">사용자 *</label>
          <select
            name="userId"
            required
            className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg"
          >
            <option value="">사용자를 선택하세요</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email} {u.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">역할 *</label>
          <select name="role" required>
            <option value="member">멤버</option>
            <option value="project_manager">프로젝트 관리자</option>
          </select>
        </div>
        <button type="submit">추가</button>
      </form>
    </div>
  </div>
)}
```

#### Notion 페이지 추가 모달

```tsx
{showAddNotionModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-semibold text-white mb-4">Notion 페이지 추가</h3>
      <form onSubmit={handleAddNotionPages} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">페이지 선택 *</label>
          <div className="max-h-60 overflow-y-auto bg-slate-700 rounded-lg p-3 space-y-2">
            {selectableNotionPages?.map((page) => (
              <label key={page.id} className="flex items-center gap-2 p-2 hover:bg-slate-600 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedNotionPageIds.has(page.id)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedNotionPageIds);
                    if (e.target.checked) {
                      newSelected.add(page.id);
                    } else {
                      newSelected.delete(page.id);
                    }
                    setSelectedNotionPageIds(newSelected);
                  }}
                />
                <span className="text-white text-sm">{page.title || page.pageId || page.id}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={selectedNotionPageIds.size === 0}>
          추가
        </button>
      </form>
    </div>
  </div>
)}
```

#### Swagger 문서 추가 모달

```tsx
{showAddSwaggerModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-semibold text-white mb-4">Swagger 문서 추가</h3>
      <form onSubmit={handleAddSwaggerDocuments} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">문서 선택 *</label>
          <div className="max-h-60 overflow-y-auto bg-slate-700 rounded-lg p-3 space-y-2">
            {selectableSwaggerDocuments?.map((doc) => (
              <label key={doc.id} className="flex items-center gap-2 p-2 hover:bg-slate-600 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSwaggerDocumentIds.has(doc.id)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedSwaggerDocumentIds);
                    if (e.target.checked) {
                      newSelected.add(doc.id);
                    } else {
                      newSelected.delete(doc.id);
                    }
                    setSelectedSwaggerDocumentIds(newSelected);
                  }}
                />
                <div className="text-white text-sm">
                  <div className="font-medium">{doc.key}</div>
                  {doc.swaggerUrl && (
                    <div className="text-xs text-slate-400">{doc.swaggerUrl}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={selectedSwaggerDocumentIds.size === 0}>
          추가
        </button>
      </form>
    </div>
  </div>
)}
```

## 채팅 화면에 프로젝트 선택 기능 추가

### 파일: `src/components/ConversationSidebar.tsx`

대화 목록 사이드바 상단에 프로젝트 선택 드롭다운을 추가합니다.

#### 프로젝트 선택 UI

```tsx
import { useProjects } from '../api/projects';

interface ConversationSidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
}

export function ConversationSidebar({
  selectedConversationId,
  onSelectConversation,
  selectedProjectId,
  onSelectProject,
}: ConversationSidebarProps) {
  const { data: projects } = useProjects();

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* 프로젝트 선택 */}
      <div className="p-4 border-b border-slate-800">
        <label className="block text-xs text-slate-400 mb-2">프로젝트</label>
        <select
          value={selectedProjectId || ''}
          onChange={(e) => onSelectProject(e.target.value || null)}
          className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 문서</option>
          {projects?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* 기존 대화 목록 */}
      ...
    </div>
  );
}
```

### 파일: `src/App.tsx`

프로젝트 선택 상태를 URL 파라미터와 연동합니다.

```typescript
function ChatLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');
  const projectIdFromUrl = searchParams.get('project');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationIdFromUrl);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectIdFromUrl);

  const handleSelectProject = (id: string | null) => {
    setSelectedProjectId(id);
    const params = new URLSearchParams(searchParams);
    if (id) {
      params.set('project', id);
    } else {
      params.delete('project');
    }
    setSearchParams(params);
  };

  return (
    <>
      <div className="fixed left-0 top-0 w-64 h-screen z-20">
        <ConversationSidebar
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
        />
      </div>
      <div className="ml-64">
        <Chat 
          conversationId={selectedConversationId} 
          onConversationCreated={handleConversationCreated}
          projectId={selectedProjectId}
        />
      </div>
    </>
  );
}
```

### 파일: `src/components/Chat.tsx`

RAG 쿼리에 projectId를 전달합니다.

```typescript
interface ChatProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
  projectId: string | null;
}

export function Chat({ conversationId, onConversationCreated, projectId }: ChatProps) {
  const handleSend = (question: string, queryType: QueryType) => {
    const conversationHistory = buildConversationHistory(messages);
    
    if (queryType === 'swagger') {
      // Swagger API 호출
      if (currentConversationId) {
        swaggerMutation.mutate({ 
          question, 
          conversationId: currentConversationId 
        });
      } else {
        swaggerMutation.mutate({ 
          question, 
          conversationHistory 
        });
      }
    } else {
      // RAG API 호출 (projectId 포함)
      if (currentConversationId) {
        ragMutation.mutate({ 
          question, 
          projectId: projectId || undefined,
          conversationId: currentConversationId 
        });
      } else {
        ragMutation.mutate({ 
          question, 
          projectId: projectId || undefined,
          conversationHistory 
        });
      }
    }
  };
}
```

### 파일: `src/api/rag.ts`

RAG 쿼리 함수에서 projectId를 전달합니다.

```typescript
export async function queryRAG(request: RAGQueryRequest): Promise<RAGQueryResponse> {
  try {
    const queryDto: QueryDto = {
      question: request.question,
      projectId: request.projectId,  // projectId 추가
      conversationId: request.conversationId,
      conversationHistory: request.conversationHistory?.map((msg) => ({
        role: msg.role as GeneratedConversationMessage['role'],
        content: msg.content,
      })),
    };

    const response = await ragApi.query({ queryDto });
    return (response.data as unknown) as RAGQueryResponse;
  } catch (error: any) {
    // 에러 처리
  }
}
```

### 파일: `src/types/api.ts`

RAGQueryRequest 타입에 projectId를 추가합니다.

```typescript
export interface RAGQueryRequest {
  question: string;
  projectId?: string;  // 추가
  conversationId?: string;
  conversationHistory?: ConversationMessage[];
}
```

## 권한별 기능 분기

### 프로젝트 관리자

프로젝트 관리자는 다음 기능을 사용할 수 있습니다:

- ✅ 프로젝트 정보 수정
- ✅ 프로젝트 삭제
- ✅ 멤버 추가/수정/제거
- ✅ Notion 페이지 추가/제거
- ✅ Swagger 문서 추가/제거
- ✅ 프로젝트 정보 조회
- ✅ 멤버 목록 조회
- ✅ 문서 목록 조회

### 일반 멤버

일반 멤버는 다음 기능만 사용할 수 있습니다:

- ❌ 프로젝트 정보 수정 (불가)
- ❌ 프로젝트 삭제 (불가)
- ❌ 멤버 추가/수정/제거 (불가)
- ❌ 문서 추가/제거 (불가)
- ✅ 프로젝트 정보 조회
- ✅ 멤버 목록 조회
- ✅ 문서 목록 조회

### 권한 확인 로직

```typescript
// 현재 사용자가 프로젝트 관리자인지 확인
const currentUserMember = members?.find((m) => m.userId === user?.id);
const isProjectManager = currentUserMember?.role === 'project_manager';
const isMember = currentUserMember !== undefined;

// 프로젝트 관리자만 수정/삭제 버튼 표시
{isProjectManager && (
  <button onClick={handleDeleteProject}>
    프로젝트 삭제
  </button>
)}
```

## 사용 방법

### 1. 프로젝트 생성 (서브 관리자/관리자)

1. 관리자 페이지(`/admin`)로 이동
2. "프로젝트 관리" 탭 선택
3. 프로젝트 이름과 설명 입력
4. "프로젝트 생성" 버튼 클릭
5. 생성자가 자동으로 프로젝트 관리자로 추가됨

### 2. 프로젝트 관리 (프로젝트 관리자)

1. 설정 페이지(`/management`)로 이동
2. "프로젝트 관리" 메뉴 선택
3. 프로젝트 목록에서 관리할 프로젝트 선택
4. 프로젝트 상세 정보에서 다음 작업 수행:
   - 프로젝트 정보 수정
   - 멤버 추가/수정/제거
   - Notion 페이지 추가/제거
   - Swagger 문서 추가/제거

### 3. 멤버 추가

1. 프로젝트 상세 화면에서 "멤버" 섹션의 "+ 멤버 추가" 버튼 클릭
2. 사용자 선택 드롭다운에서 추가할 사용자 선택
3. 역할 선택 (멤버 또는 프로젝트 관리자)
4. "추가" 버튼 클릭

### 4. 문서 추가

#### Notion 페이지 추가

1. 프로젝트 상세 화면에서 "Notion 페이지" 섹션의 "+ 페이지 추가" 버튼 클릭
2. 추가 가능한 페이지 목록에서 체크박스로 선택
3. "추가" 버튼 클릭

#### Swagger 문서 추가

1. 프로젝트 상세 화면에서 "Swagger 문서" 섹션의 "+ 문서 추가" 버튼 클릭
2. 추가 가능한 문서 목록에서 체크박스로 선택
3. "추가" 버튼 클릭

### 5. 프로젝트별 검색

1. 채팅 화면의 사이드바 상단에서 프로젝트 선택
2. "전체 문서"를 선택하면 모든 문서 검색
3. 특정 프로젝트를 선택하면 해당 프로젝트의 문서만 검색
4. 질문을 입력하면 선택한 프로젝트의 문서 기반으로 답변 생성

### 6. URL 파라미터

프로젝트 선택 상태는 URL에 저장됩니다:

- `/` - 기본 (프로젝트 미선택)
- `/?project=project-id` - 특정 프로젝트 선택
- `/?project=project-id&conversation=conversation-id` - 프로젝트와 대화 모두 선택

## 주요 특징

### 1. 권한 기반 접근 제어

- 프로젝트 관리자: 모든 관리 기능 사용 가능
- 일반 멤버: 조회만 가능
- 서버에서도 권한 검증 수행

### 2. 선택 가능한 항목 조회

- 사용자 목록: 서브 관리자/관리자만 조회 가능
- Notion 페이지 목록: 모든 인증된 사용자 조회 가능
- Swagger 문서 목록: 모든 인증된 사용자 조회 가능

### 3. 프로젝트별 문서 검색

- 프로젝트를 선택하면 해당 프로젝트의 문서만 검색
- 프로젝트 미선택 시 전체 문서 검색
- RAG 쿼리에 `projectId` 파라미터 전달

### 4. URL 상태 관리

- 프로젝트 선택 상태가 URL에 저장
- 새로고침해도 선택 상태 유지
- URL 공유 시 프로젝트 상태 유지

## 트러블슈팅

### 프로젝트 목록이 보이지 않는 경우

- 사용자가 참여한 프로젝트가 없는 경우
- API 권한 문제 확인
- 브라우저 콘솔에서 에러 확인

### 멤버 추가 시 사용자 목록이 비어있는 경우

- 서브 관리자/관리자 권한이 필요한 API입니다
- 현재 사용자의 권한 확인
- API 응답 구조 확인

### 프로젝트별 검색이 작동하지 않는 경우

- `projectId`가 RAG 쿼리에 전달되는지 확인
- 브라우저 개발자 도구의 Network 탭에서 요청 확인
- 서버 로그에서 `projectId` 수신 여부 확인

## 다음 단계

프로젝트 기반 권한 관리 시스템이 완성되었습니다. 추가로 구현할 수 있는 기능:

- 프로젝트별 대화 관리
- 프로젝트 통계 및 분석
- 프로젝트 템플릿 기능
- 프로젝트 간 문서 공유


