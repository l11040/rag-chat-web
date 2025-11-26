import { axiosInstance } from './client';

export interface TokenUsage {
  id: string;
  userId: string;
  conversationId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  createdAt: string;
}

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

// 토큰 사용량 목록 조회
export async function getTokenUsage(params?: TokenUsageListParams): Promise<TokenUsage[]> {
  const response = await axiosInstance.get('/token-usage', {
    params: {
      limit: params?.limit,
      offset: params?.offset,
    },
  });
  const data = response.data;
  
  // 응답이 배열로 직접 오거나, data 속성 안에 있을 수 있음
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  
  // 배열이 아닌 경우 빈 배열 반환
  return [];
}

// 토큰 사용량 통계 조회
export async function getTokenUsageStats(): Promise<TokenUsageStats> {
  try {
    const response = await axiosInstance.get('/token-usage/stats');
    const data = response.data;
    
    // 디버깅: 응답 구조 확인
    console.log('Token Usage Stats API Response:', data);
    
    // 응답 구조: { success: true, stats: { ... } } 또는 { data: { ... } } 또는 직접 stats 객체
    const stats = data?.stats || data?.data || data;
    
    // 필드명이 다른 경우를 대비한 매핑
    const result: TokenUsageStats = {
      totalPromptTokens: stats?.totalPromptTokens ?? stats?.total_prompt_tokens ?? stats?.promptTokens ?? 0,
      totalCompletionTokens: stats?.totalCompletionTokens ?? stats?.total_completion_tokens ?? stats?.completionTokens ?? 0,
      totalTokens: stats?.totalTokens ?? stats?.total_tokens ?? 0,
      usageCount: stats?.usageCount ?? stats?.usage_count ?? stats?.count ?? 0,
      averageTokens: stats?.averageTokensPerQuery ?? stats?.averageTokens ?? stats?.average_tokens ?? (stats?.totalTokens && stats?.usageCount ? stats.totalTokens / stats.usageCount : 0),
    };
    
    console.log('Parsed Token Usage Stats:', result);
    return result;
  } catch (error: any) {
    console.error('Error fetching token usage stats:', error);
    console.error('Error response:', error.response?.data);
    throw error;
  }
}

// 특정 대화의 토큰 사용량 조회
export async function getTokenUsageByConversation(conversationId: string): Promise<TokenUsage[]> {
  const response = await axiosInstance.get(`/token-usage/conversation/${conversationId}`);
  const data = response.data;
  
  // 응답이 배열로 직접 오거나, data 속성 안에 있을 수 있음
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  
  // 배열이 아닌 경우 빈 배열 반환
  return [];
}

// 날짜 범위별 토큰 사용량 조회
export async function getTokenUsageByDateRange(params: TokenUsageDateRangeParams): Promise<TokenUsage[]> {
  const response = await axiosInstance.get('/token-usage/date-range', {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
    },
  });
  const data = response.data;
  
  // 응답이 배열로 직접 오거나, data 속성 안에 있을 수 있음
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  
  // 배열이 아닌 경우 빈 배열 반환
  return [];
}

