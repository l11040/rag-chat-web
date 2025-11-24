import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import { Configuration } from './generated';
import { RAGApi, DefaultApi, AppApi, NotionApi, OpenaiApi } from './generated';
import type { RefreshTokenDto } from './generated/models';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

// 토큰 갱신 중인지 추적 (중복 요청 방지)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Axios 인스턴스 생성
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request 인터셉터 - 모든 요청에 액세스 토큰 자동 삽입
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response 인터셉터 - 401 에러 시 토큰 갱신 및 재시도
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 에러이고 아직 재시도하지 않은 요청인 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 이미 토큰 갱신 중이면 대기열에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      
      if (!refreshToken) {
        // 리프레시 토큰이 없으면 로그인 페이지로 이동
        processQueue(error, null);
        isRefreshing = false;
        clearAuthData();
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        // 토큰 갱신 시도
        const refreshTokenDto: RefreshTokenDto = { refreshToken };
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          refreshTokenDto,
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const data = refreshResponse.data as any;
        const newAccessToken = data.accessToken || data.access_token;
        const newRefreshToken = data.refreshToken || data.refresh_token || refreshToken;

        if (newAccessToken) {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
          if (newRefreshToken && newRefreshToken !== refreshToken) {
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          }

          // 대기 중인 요청들 처리
          processQueue(null, newAccessToken);

          // 원래 요청 재시도
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          isRefreshing = false;
          return axiosInstance(originalRequest);
        } else {
          throw new Error('토큰 갱신 응답에 액세스 토큰이 없습니다.');
        }
      } catch (refreshError) {
        // 토큰 갱신 실패 시 로그인 페이지로 이동
        processQueue(refreshError as AxiosError, null);
        isRefreshing = false;
        clearAuthData();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// 인증 데이터 초기화
function clearAuthData() {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem('user');
}

// 로그인 페이지로 리다이렉트
function redirectToLogin() {
  // 현재 경로가 로그인/회원가입 페이지가 아닌 경우에만 리다이렉트
  if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
    window.location.href = '/login';
  }
}

// OpenAPI 클라이언트 설정 - 동적으로 토큰을 가져오도록 설정
const getAccessToken = () => {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '';
};

const configuration = new Configuration({
  basePath: API_BASE_URL,
  accessToken: getAccessToken,
});

// 생성된 API 클라이언트 인스턴스들 export
// BaseAPI 생성자: (configuration?, basePath?, axios?)
export const ragApi = new RAGApi(configuration, API_BASE_URL, axiosInstance);
export const defaultApi = new DefaultApi(configuration, API_BASE_URL, axiosInstance);
export const appApi = new AppApi(configuration, API_BASE_URL, axiosInstance);
export const notionApi = new NotionApi(configuration, API_BASE_URL, axiosInstance);
export const openaiApi = new OpenaiApi(configuration, API_BASE_URL, axiosInstance);
