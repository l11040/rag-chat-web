import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
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
  (config: InternalAxiosRequestConfig) => {
    // 요청 전 처리 (예: 토큰 추가, 로깅 등)
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response 인터셉터
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // 응답 성공 시 처리
    return response;
  },
  (error) => {
    // 응답 에러 처리
    // 예: 401 에러 시 토큰 갱신, 로그아웃 등
    // if (error.response?.status === 401) {
    //   // 토큰 갱신 또는 로그아웃 처리
    // }
    return Promise.reject(error);
  }
);

// OpenAPI 클라이언트 설정
const configuration = new Configuration({
  basePath: API_BASE_URL,
});

// 생성된 API 클라이언트 인스턴스들 export
// BaseAPI 생성자: (configuration?, basePath?, axios?)
export const ragApi = new RAGApi(configuration, API_BASE_URL, axiosInstance);
export const defaultApi = new DefaultApi(configuration, API_BASE_URL, axiosInstance);
export const appApi = new AppApi(configuration, API_BASE_URL, axiosInstance);
export const notionApi = new NotionApi(configuration, API_BASE_URL, axiosInstance);
export const openaiApi = new OpenaiApi(configuration, API_BASE_URL, axiosInstance);
