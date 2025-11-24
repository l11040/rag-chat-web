# 03. 관리자 페이지 구축

사용자 권한 시스템을 기반으로 관리자 전용 페이지를 구축하여 사용자 목록 조회 및 권한 관리 기능을 구현합니다.

## 목차

1. [개요](#개요)
2. [OpenAPI 스펙 업데이트](#openapi-스펙-업데이트)
3. [인증 컨텍스트 확장](#인증-컨텍스트-확장)
4. [관리자 라우트 보호](#관리자-라우트-보호)
5. [관리자 페이지 구성](#관리자-페이지-구성)
6. [관리자 버튼 추가](#관리자-버튼-추가)
7. [사용 방법](#사용-방법)
8. [API 응답 구조 맞춤](#api-응답-구조-맞춤)

## 개요

이 프로젝트는 다음과 같은 관리자 기능을 제공합니다:

- **권한 기반 접근 제어**: 관리자(admin) 및 서브 관리자(sub_admin)만 접근 가능
- **사용자 목록 조회**: 모든 사용자 정보 조회
- **사용자 정보 수정**: 이메일, 비밀번호, 권한 변경
- **권한별 UI 표시**: 권한에 따른 색상 및 라벨 표시
- **관리자 페이지 접근 버튼**: 관리자에게만 표시되는 네비게이션 버튼

### 권한 구조

```typescript
enum UpdateUserDtoRoleEnum {
  user = 'user',                    // 일반 사용자
  project_manager = 'project_manager', // 프로젝트 매니저
  sub_admin = 'sub_admin',           // 서브 관리자
  admin = 'admin'                    // 관리자
}
```

## OpenAPI 스펙 업데이트

백엔드에서 권한 관련 API가 추가되었다면, OpenAPI 스펙을 다시 생성해야 합니다.

### API 생성

```bash
npm run generate:api
```

### 추가된 API 엔드포인트

관리자 페이지에서 사용하는 주요 API:

1. **모든 사용자 조회** (관리자 전용)
   - `GET /auth/users`
   - `defaultApi.getAllUsers()`

2. **특정 사용자 조회** (관리자 전용)
   - `GET /auth/users/{id}`
   - `defaultApi.getUserById({ id })`

3. **사용자 정보 수정** (관리자 전용)
   - `PATCH /auth/users/{id}`
   - `defaultApi.updateUser({ id, updateUserDto })`

4. **현재 사용자 정보 조회**
   - `POST /auth/me`
   - `defaultApi.getProfile()`

### 생성된 모델

`UpdateUserDto` 모델이 생성됩니다:

```typescript
export interface UpdateUserDto {
  email?: string;
  password?: string;
  role?: UpdateUserDtoRoleEnum;
}

export enum UpdateUserDtoRoleEnum {
  user = 'user',
  project_manager = 'project_manager',
  sub_admin = 'sub_admin',
  admin = 'admin'
}
```

## 인증 컨텍스트 확장

### 파일: `src/contexts/AuthContext.tsx`

유저 정보에 권한(role) 정보를 추가하고, 관리자 여부를 확인하는 기능을 추가합니다.

### User 인터페이스 확장

```typescript
import { UpdateUserDtoRoleEnum } from '../api/generated/models';

interface User {
  id: string;
  email: string;
  role?: UpdateUserDtoRoleEnum;  // 권한 정보 추가
}
```

### AuthContextType 확장

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;  // 관리자 여부 추가
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  fetchUserProfile: () => Promise<void>;  // 프로필 정보 가져오기 추가
}
```

### 관리자 여부 확인

```typescript
const isAdmin = user?.role === UpdateUserDtoRoleEnum.admin || 
               user?.role === UpdateUserDtoRoleEnum.sub_admin;
```

관리자(`admin`)와 서브 관리자(`sub_admin`) 모두 관리자 권한으로 간주됩니다.

### 프로필 정보 가져오기 함수

최신 유저 정보(권한 포함)를 서버에서 가져옵니다:

```typescript
const fetchUserProfile = useCallback(async () => {
  try {
    const response = await defaultApi.getProfile();
    const userData = response.data as any;
    
    if (userData) {
      const updatedUser: User = {
        id: userData.id || userData.userId || '',
        email: userData.email || '',
        role: userData.role,  // 권한 정보 포함
      };
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
  } catch (error) {
    console.error('프로필 정보 가져오기 실패:', error);
    throw error;
  }
}, []);
```

### 로그인/회원가입 시 권한 정보 저장

로그인 및 회원가입 응답에서 권한 정보를 추출하여 저장합니다:

```typescript
const login = async (email: string, password: string) => {
  const response = await defaultApi.login({ loginDto });
  const data = response.data as any;
  
  const userData: User = data.user || { 
    id: data.userId || '', 
    email,
    role: data.role || data.user?.role,  // 권한 정보 포함
  };
  
  saveAuthData({ accessToken, refreshToken }, userData);
  
  // 로그인 후 최신 프로필 정보 가져오기
  await fetchUserProfile();
};
```

## 관리자 라우트 보호

### 파일: `src/components/AdminRoute.tsx`

관리자만 접근할 수 있도록 보호하는 라우트 컴포넌트를 생성합니다.

#### 주요 기능

1. **인증 확인**: 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
2. **권한 확인**: 관리자가 아닌 사용자는 홈으로 리다이렉트
3. **로딩 상태**: 인증 상태 확인 중 로딩 표시

#### 코드 구조

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

## 관리자 페이지 구성

### 파일: `src/components/Admin.tsx`

사용자 목록을 조회하고 관리하는 관리자 페이지를 구성합니다.

#### 주요 기능

1. **사용자 목록 조회**: `getAllUsers` API를 사용하여 모든 사용자 정보 가져오기
2. **사용자 정보 수정**: 이메일, 비밀번호, 권한 변경
3. **권한별 표시**: 권한에 따른 색상 및 라벨 표시
4. **모달 기반 수정**: 사용자 정보 수정을 위한 모달 UI

#### 사용자 목록 조회

```typescript
const fetchUsers = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await defaultApi.getAllUsers();
    
    // 다양한 응답 구조 처리
    let userList: User[] = [];
    
    if (Array.isArray(response.data)) {
      userList = response.data;
    } else if (response.data && Array.isArray(response.data.users)) {
      userList = response.data.users;
    } else if (response.data && Array.isArray(response.data.data)) {
      userList = response.data.data;
    } else if (response.data && typeof response.data === 'object') {
      const values = Object.values(response.data);
      if (values.length > 0 && Array.isArray(values[0])) {
        userList = values[0] as User[];
      }
    }
    
    setUsers(userList);
  } catch (err: any) {
    setError(err.response?.data?.message || '사용자 목록을 가져오는데 실패했습니다.');
  } finally {
    setLoading(false);
  }
};
```

#### 사용자 정보 수정

```typescript
const handleUpdateUser = async () => {
  if (!editingUser) return;

  try {
    setError(null);
    const updateData: UpdateUserDto = {
      ...editForm,
    };

    // 비밀번호가 비어있으면 업데이트하지 않음
    if (!updateData.password || updateData.password.trim() === '') {
      delete updateData.password;
    }

    await defaultApi.updateUser({
      id: editingUser.id,
      updateUserDto: updateData,
    });

    // 성공 시 목록 새로고침
    await fetchUsers();
    handleCancelEdit();
  } catch (err: any) {
    setError(err.response?.data?.message || '사용자 정보를 업데이트하는데 실패했습니다.');
  }
};
```

#### 권한별 표시

```typescript
const getRoleLabel = (role?: UpdateUserDtoRoleEnum) => {
  switch (role) {
    case UpdateUserDtoRoleEnum.admin:
      return '관리자';
    case UpdateUserDtoRoleEnum.sub_admin:
      return '서브 관리자';
    case UpdateUserDtoRoleEnum.project_manager:
      return '프로젝트 매니저';
    case UpdateUserDtoRoleEnum.user:
      return '사용자';
    default:
      return '미지정';
  }
};

const getRoleColor = (role?: UpdateUserDtoRoleEnum) => {
  switch (role) {
    case UpdateUserDtoRoleEnum.admin:
      return 'bg-red-500';
    case UpdateUserDtoRoleEnum.sub_admin:
      return 'bg-orange-500';
    case UpdateUserDtoRoleEnum.project_manager:
      return 'bg-blue-500';
    case UpdateUserDtoRoleEnum.user:
      return 'bg-gray-500';
    default:
      return 'bg-gray-400';
  }
};
```

#### UI 구조

```typescript
return (
  <div className="min-h-screen bg-slate-900 text-white">
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">관리자 페이지</h1>
          <p className="text-slate-400">사용자 관리 및 권한 설정</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')}>
            채팅으로 돌아가기
          </button>
          <button onClick={logout}>로그아웃</button>
        </div>
      </div>

      {/* 사용자 목록 테이블 */}
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        {/* 테이블 내용 */}
      </div>

      {/* 수정 모달 */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          {/* 모달 내용 */}
        </div>
      )}
    </div>
  </div>
);
```

## 관리자 버튼 추가

### 파일: `src/components/Chat.tsx`

관리자에게만 관리자 페이지로 이동할 수 있는 버튼을 추가합니다.

#### 버튼 추가

```typescript
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Chat() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/50 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">RAG Chat Web</h1>
          <div className="flex items-center gap-4">
            {user && <span>{user.email}</span>}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                관리자 페이지
              </button>
            )}
            <button onClick={handleLogout}>로그아웃</button>
          </div>
        </div>
      </header>
      {/* 나머지 내용 */}
    </div>
  );
}
```

## 라우팅 설정

### 파일: `src/App.tsx`

관리자 페이지 라우트를 추가합니다.

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Chat } from './components/Chat';
import { Admin } from './components/Admin';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

## 사용 방법

### 관리자 페이지 접근

1. 관리자 또는 서브 관리자 권한으로 로그인
2. 채팅 페이지 헤더의 "관리자 페이지" 버튼 클릭
3. 또는 직접 `/admin` 경로로 접근

### 사용자 정보 수정

1. 관리자 페이지에서 수정할 사용자의 "수정" 버튼 클릭
2. 모달에서 이메일, 비밀번호(선택), 권한 변경
3. "저장" 버튼 클릭하여 변경사항 저장

### 권한 변경

권한 드롭다운에서 다음 중 선택:
- 사용자 (user)
- 프로젝트 매니저 (project_manager)
- 서브 관리자 (sub_admin)
- 관리자 (admin)

## API 응답 구조 맞춤

실제 백엔드 API 응답 구조에 맞게 다음 부분들을 수정해야 할 수 있습니다.

### 1. 사용자 목록 응답 처리

**파일**: `src/components/Admin.tsx` (fetchUsers 함수)

```typescript
const response = await defaultApi.getAllUsers();

// 실제 API 응답 구조에 맞게 수정
// 예시 1: 직접 배열
// response.data = [{ id: '1', email: 'user@example.com', role: 'user' }, ...]

// 예시 2: 객체로 래핑
// response.data = { users: [{ id: '1', email: 'user@example.com', role: 'user' }, ...] }

// 예시 3: data 속성으로 래핑
// response.data = { data: [{ id: '1', email: 'user@example.com', role: 'user' }, ...] }
```

### 2. 프로필 정보 응답 처리

**파일**: `src/contexts/AuthContext.tsx` (fetchUserProfile 함수)

```typescript
const response = await defaultApi.getProfile();
const userData = response.data as any;

// 실제 API 응답 구조에 맞게 수정
const updatedUser: User = {
  id: userData.id || userData.userId || '',
  email: userData.email || '',
  role: userData.role || userData.userRole,  // 실제 필드명에 맞게 수정
};
```

### 3. 사용자 정보 수정 응답 처리

**파일**: `src/components/Admin.tsx` (handleUpdateUser 함수)

```typescript
await defaultApi.updateUser({
  id: editingUser.id,
  updateUserDto: updateData,
});

// 성공 응답 처리 (필요한 경우)
// const response = await defaultApi.updateUser(...);
// console.log('업데이트 성공:', response.data);
```

## 파일 구조

```
src/
├── contexts/
│   └── AuthContext.tsx          # 인증 컨텍스트 (권한 정보 추가)
├── components/
│   ├── Admin.tsx                 # 관리자 페이지
│   ├── AdminRoute.tsx            # 관리자 라우트 보호
│   ├── Chat.tsx                  # 채팅 페이지 (관리자 버튼 추가)
│   ├── Login.tsx
│   ├── Register.tsx
│   └── ProtectedRoute.tsx
├── api/
│   ├── client.ts
│   └── generated/                # OpenAPI 생성 파일
│       ├── api/
│       │   └── default-api.ts    # 사용자 관리 API
│       └── models/
│           └── update-user-dto.ts # UpdateUserDto 모델
└── App.tsx                       # 라우팅 설정 (관리자 라우트 추가)
```

## 주의사항

1. **권한 확인**: 서버에서도 권한을 확인하므로, 클라이언트에서만 권한을 확인하는 것은 보안상 충분하지 않습니다.
2. **API 응답 구조**: 실제 백엔드 API 응답 구조에 맞게 파싱 로직을 수정해야 합니다.
3. **에러 처리**: 권한이 없는 사용자가 API를 호출하면 403 에러가 발생할 수 있으므로 적절히 처리해야 합니다.
4. **토큰 갱신**: 관리자 페이지에서도 토큰이 만료되면 자동으로 갱신됩니다 (client.ts의 인터셉터 처리).

## 트러블슈팅

### 사용자 목록이 표시되지 않는 문제

**원인**: API 응답 구조가 코드와 일치하지 않음

**해결 방법**:
- 브라우저 개발자 도구에서 실제 API 응답 확인
- `Admin.tsx`의 `fetchUsers` 함수에서 응답 구조에 맞게 파싱 로직 수정

### 관리자 페이지 접근 불가

**원인**: 권한 정보가 제대로 저장되지 않음

**해결 방법**:
- 로그인 후 `getProfile` API가 제대로 호출되는지 확인
- 응답에 `role` 필드가 포함되어 있는지 확인
- `AuthContext.tsx`의 `fetchUserProfile` 함수 확인

### 권한 변경이 반영되지 않는 문제

**원인**: API 호출 실패 또는 응답 구조 불일치

**해결 방법**:
- 브라우저 개발자 도구에서 네트워크 탭 확인
- API 응답 및 에러 메시지 확인
- `updateUser` API 호출 부분 확인

### 관리자 버튼이 표시되지 않는 문제

**원인**: `isAdmin` 값이 `false`로 설정됨

**해결 방법**:
- `AuthContext.tsx`의 `isAdmin` 계산 로직 확인
- 사용자의 `role` 값이 올바르게 저장되었는지 확인
- `UpdateUserDtoRoleEnum.admin` 또는 `UpdateUserDtoRoleEnum.sub_admin` 값 확인

## 보안 고려사항

1. **서버 측 권한 확인**: 클라이언트에서만 권한을 확인하는 것은 보안상 충분하지 않습니다. 서버에서도 반드시 권한을 확인해야 합니다.
2. **토큰 보안**: 관리자 권한이 있는 토큰은 특히 보안에 주의해야 합니다.
3. **API 엔드포인트 보호**: 백엔드에서 관리자 전용 API는 반드시 권한을 확인해야 합니다.
4. **감사 로그**: 사용자 정보 변경 시 감사 로그를 남기는 것을 고려하세요.

## 참고 자료

- [React Router 문서](https://reactrouter.com/)
- [OpenAPI Generator 문서](https://openapi-generator.tech/)
- [TypeScript Enum](https://www.typescriptlang.org/docs/handbook/enums.html)
- [Tailwind CSS](https://tailwindcss.com/)

