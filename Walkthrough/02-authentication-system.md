# 02. 인증 시스템 구축

JWT 기반 인증 시스템을 구축하여 로그인, 회원가입, 토큰 관리, 자동 토큰 갱신 기능을 구현합니다.

## 목차

1. [개요](#개요)
2. [패키지 설치](#패키지-설치)
3. [인증 컨텍스트 구성](#인증-컨텍스트-구성)
4. [API 클라이언트 인증 처리](#api-클라이언트-인증-처리)
5. [로그인/회원가입 화면](#로그인회원가입-화면)
6. [라우팅 및 보호된 라우트](#라우팅-및-보호된-라우트)
7. [사용 방법](#사용-방법)
8. [API 응답 구조 맞춤](#api-응답-구조-맞춤)

## 개요

이 프로젝트는 다음과 같은 인증 기능을 제공합니다:

- **로그인/회원가입**: 이메일과 비밀번호 기반 인증
- **토큰 관리**: Access Token과 Refresh Token을 localStorage에 저장
- **자동 토큰 갱신**: Access Token 만료 시 Refresh Token으로 자동 갱신
- **요청 인터셉터**: 모든 API 요청에 자동으로 토큰 추가
- **에러 처리**: 토큰 갱신 실패 시 로그인 페이지로 리다이렉트
- **보호된 라우트**: 인증되지 않은 사용자 접근 차단

## 패키지 설치

React Router를 설치합니다:

```bash
npm install react-router-dom
```

### 설치된 패키지

**의존성 (dependencies)**
- `react-router-dom`: 클라이언트 사이드 라우팅
- `axios`: HTTP 클라이언트 (이미 설치됨)
- `@tanstack/react-query`: 서버 상태 관리 (이미 설치됨)

## 인증 컨텍스트 구성

### 파일: `src/contexts/AuthContext.tsx`

인증 상태와 관련 함수를 제공하는 Context를 생성합니다.

#### 주요 기능

1. **토큰 및 유저 정보 저장**: localStorage에 Access Token, Refresh Token, 유저 정보 저장
2. **로그인/회원가입**: API 호출 및 응답 처리
3. **토큰 갱신**: Refresh Token을 사용한 Access Token 갱신
4. **로그아웃**: 토큰 및 유저 정보 삭제
5. **초기 로드**: 앱 시작 시 저장된 토큰으로 인증 상태 복원

#### 코드 구조

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}
```

#### 토큰 저장소

```typescript
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
} as const;
```

#### 초기 로드 처리

앱 시작 시 localStorage에서 토큰을 확인하고, 유효한 경우 유저 정보를 복원합니다:

```typescript
useEffect(() => {
  const loadAuthData = async () => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const storedAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (storedUser && storedAccessToken) {
      // 토큰 유효성 확인
      try {
        await defaultApi.getProfile();
        setUser(JSON.parse(storedUser));
      } catch (error) {
        // 토큰 만료 시 리프레시 시도
        if (storedRefreshToken) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            clearAuthData();
          }
        }
      }
    }
  };
  loadAuthData();
}, []);
```

## API 클라이언트 인증 처리

### 파일: `src/api/client.ts`

Axios 인터셉터를 사용하여 모든 요청에 토큰을 자동으로 추가하고, 401 에러 시 토큰을 자동으로 갱신합니다.

#### Request 인터셉터

모든 요청에 Access Token을 자동으로 추가합니다:

```typescript
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

#### Response 인터셉터

401 에러 발생 시 자동으로 토큰을 갱신하고 원래 요청을 재시도합니다:

```typescript
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 에러이고 아직 재시도하지 않은 요청인 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 토큰 갱신 시도
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        // Refresh Token으로 새 Access Token 발급
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken = refreshResponse.data.accessToken;
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // 토큰 갱신 실패 시 로그인 페이지로 이동
        clearAuthData();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

#### 동시 요청 처리

여러 요청이 동시에 401 에러를 받을 경우, 중복 토큰 갱신을 방지합니다:

```typescript
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

// 토큰 갱신 중이면 대기열에 추가
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  })
    .then((token) => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return axiosInstance(originalRequest);
    });
}
```

#### Configuration 설정

OpenAPI Configuration에 동적으로 토큰을 가져오도록 설정합니다:

```typescript
const getAccessToken = () => {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '';
};

const configuration = new Configuration({
  basePath: API_BASE_URL,
  accessToken: getAccessToken,
});
```

## 로그인/회원가입 화면

### 로그인 화면: `src/components/Login.tsx`

이메일과 비밀번호를 입력받아 로그인을 수행합니다.

#### 주요 기능

- 이메일/비밀번호 입력 폼
- 에러 메시지 표시
- 로딩 상태 표시
- 회원가입 페이지로 이동 링크

#### 사용 예시

```typescript
const { login } = useAuth();
const navigate = useNavigate();

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  try {
    await login(email, password);
    navigate('/');
  } catch (err: any) {
    setError(err.message || '로그인에 실패했습니다.');
  }
};
```

### 회원가입 화면: `src/components/Register.tsx`

새 계정을 생성합니다.

#### 주요 기능

- 이메일/비밀번호/비밀번호 확인 입력
- 비밀번호 유효성 검사 (8-50자)
- 에러 메시지 표시
- 로그인 페이지로 이동 링크

#### 비밀번호 검증

```typescript
if (password !== confirmPassword) {
  setError('비밀번호가 일치하지 않습니다.');
  return;
}

if (password.length < 8 || password.length > 50) {
  setError('비밀번호는 8자 이상 50자 이하여야 합니다.');
  return;
}
```

## 라우팅 및 보호된 라우트

### 라우팅 설정: `src/App.tsx`

React Router를 사용하여 라우팅을 구성합니다.

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Chat } from './components/Chat';

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 보호된 라우트: `src/components/ProtectedRoute.tsx`

인증되지 않은 사용자를 로그인 페이지로 리다이렉트합니다.

```typescript
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

## 사용 방법

### 컴포넌트에서 인증 상태 사용

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>로그인이 필요합니다.</div>;
  }

  return (
    <div>
      <p>안녕하세요, {user?.email}님!</p>
      <button onClick={logout}>로그아웃</button>
    </div>
  );
}
```

### API 요청 시 자동 토큰 추가

모든 API 요청에 자동으로 토큰이 추가되므로 별도 처리가 필요 없습니다:

```typescript
// 토큰이 자동으로 헤더에 추가됨
const response = await ragApi.query({ queryDto });
```

### 토큰 만료 시 자동 처리

토큰이 만료되어 401 에러가 발생하면:

1. 자동으로 Refresh Token으로 새 Access Token 발급
2. 원래 요청을 새 토큰으로 재시도
3. Refresh Token도 만료된 경우 로그인 페이지로 리다이렉트

## API 응답 구조 맞춤

실제 백엔드 API 응답 구조에 맞게 다음 파일들을 수정해야 할 수 있습니다.

### 1. 로그인 응답 처리

**파일**: `src/contexts/AuthContext.tsx` (120-135줄)

```typescript
const login = async (email: string, password: string) => {
  const response = await defaultApi.login({ loginDto });
  
  // 실제 API 응답 구조에 맞게 수정
  const data = response.data as any;
  const accessToken = data.accessToken || data.access_token;
  const refreshToken = data.refreshToken || data.refresh_token;
  const userData = data.user || { id: data.userId || '', email };

  if (!accessToken || !refreshToken) {
    throw new Error('토큰을 받지 못했습니다.');
  }

  saveAuthData({ accessToken, refreshToken }, userData);
};
```

**일반적인 응답 구조 예시:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "email": "user@example.com"
  }
}
```

### 2. 회원가입 응답 처리

**파일**: `src/contexts/AuthContext.tsx` (142-160줄)

회원가입 후 자동 로그인을 원하는 경우:

```typescript
const register = async (email: string, password: string) => {
  const response = await defaultApi.register({ registerDto });
  
  // 회원가입 후 토큰이 반환되는 경우
  const data = response.data as any;
  if (data.accessToken && data.refreshToken) {
    const accessToken = data.accessToken;
    const refreshToken = data.refreshToken;
    const userData = data.user || { id: data.userId || '', email };
    saveAuthData({ accessToken, refreshToken }, userData);
  } else {
    // 회원가입만 하고 로그인은 별도로 해야 하는 경우
    throw new Error('회원가입은 완료되었지만 자동 로그인에 실패했습니다.');
  }
};
```

### 3. 토큰 갱신 응답 처리

**파일**: `src/api/client.ts` (리프레시 토큰 응답 처리 부분)

```typescript
const refreshResponse = await axios.post(
  `${API_BASE_URL}/auth/refresh`,
  { refreshToken }
);

// 실제 API 응답 구조에 맞게 수정
const data = refreshResponse.data as any;
const newAccessToken = data.accessToken || data.access_token;
const newRefreshToken = data.refreshToken || data.refresh_token || refreshToken;
```

### 4. 유저 정보 조회 응답 처리

**파일**: `src/contexts/AuthContext.tsx` (초기 로드 부분)

```typescript
// getProfile 응답 구조에 맞게 유저 정보 파싱
const profileResponse = await defaultApi.getProfile();
const userData = profileResponse.data as any;
// 예: { id: userData.id, email: userData.email, ... }
```

## 파일 구조

```
src/
├── contexts/
│   └── AuthContext.tsx          # 인증 컨텍스트
├── components/
│   ├── Login.tsx                # 로그인 화면
│   ├── Register.tsx             # 회원가입 화면
│   ├── ProtectedRoute.tsx       # 보호된 라우트
│   └── Chat.tsx                 # 채팅 화면 (보호됨)
├── api/
│   └── client.ts                # API 클라이언트 (인증 처리)
└── App.tsx                      # 라우팅 설정
```

## 주의사항

1. **API 응답 구조 확인**: 실제 백엔드 API 응답 구조에 맞게 코드를 수정해야 합니다.
2. **토큰 저장 위치**: 현재는 localStorage를 사용하지만, 보안이 중요한 경우 httpOnly 쿠키 사용을 고려하세요.
3. **토큰 만료 시간**: Access Token과 Refresh Token의 만료 시간을 확인하고 적절히 설정하세요.
4. **에러 처리**: 네트워크 에러와 인증 에러를 구분하여 처리하세요.

## 트러블슈팅

### 로그인 후 즉시 로그아웃되는 문제

**원인**: API 응답 구조가 코드와 일치하지 않음

**해결 방법**:
- 브라우저 개발자 도구에서 실제 API 응답 확인
- `AuthContext.tsx`의 응답 파싱 로직 수정

### 토큰 갱신이 작동하지 않는 문제

**원인**: Refresh Token API 응답 구조 불일치

**해결 방법**:
- `src/api/client.ts`의 리프레시 토큰 응답 처리 부분 확인
- 실제 API 응답 구조에 맞게 수정

### 무한 리다이렉트 문제

**원인**: 로그인 페이지에서도 인증 체크를 하는 경우

**해결 방법**:
- `redirectToLogin()` 함수에서 현재 경로 확인 로직 확인
- 로그인/회원가입 페이지는 인증 체크에서 제외

### CORS 에러

**원인**: 백엔드에서 CORS 설정이 올바르지 않음

**해결 방법**:
- 백엔드 CORS 설정 확인
- `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials` 헤더 확인

## 보안 고려사항

1. **XSS 공격 방지**: localStorage는 XSS 공격에 취약할 수 있습니다. Content Security Policy(CSP) 설정을 고려하세요.
2. **CSRF 공격 방지**: 토큰 기반 인증은 CSRF에 상대적으로 안전하지만, 추가 보안 조치를 고려하세요.
3. **토큰 만료 시간**: Access Token은 짧게, Refresh Token은 길게 설정하는 것이 좋습니다.
4. **HTTPS 사용**: 프로덕션 환경에서는 반드시 HTTPS를 사용하세요.

## 참고 자료

- [React Router 문서](https://reactrouter.com/)
- [JWT.io](https://jwt.io/)
- [Axios 인터셉터](https://axios-http.com/docs/interceptors)
- [React Context API](https://react.dev/reference/react/createContext)

