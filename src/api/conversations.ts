import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from './client';
import type { CreateConversationDto, UpdateConversationTitleDto } from './generated/models';

// 대화 타입 정의
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

// API 응답 타입
interface CreateConversationResponse {
  success: boolean;
  conversation: Conversation;
}

interface GetConversationsResponse {
  success: boolean;
  conversations: Conversation[];
}

interface GetConversationResponse {
  success: boolean;
  conversation: ConversationWithMessages;
}

interface UpdateConversationTitleResponse {
  success: boolean;
  conversation: Conversation;
}

interface DeleteConversationResponse {
  success: boolean;
  message: string;
}

/**
 * 새 대화 생성
 */
export async function createConversation(
  title?: string
): Promise<CreateConversationResponse> {
  try {
    const createConversationDto: CreateConversationDto = title ? { title } : {};
    const response = await conversationApi.createConversation({
      createConversationDto,
    });
    return response.data as unknown as CreateConversationResponse;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        statusText;
      throw new Error(`대화 생성 실패: ${status} ${errorMessage}`);
    } else if (error.request) {
      throw new Error('서버에 연결할 수 없습니다.');
    } else {
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.');
    }
  }
}

/**
 * 사용자의 모든 대화 목록 조회
 */
export async function getConversations(): Promise<GetConversationsResponse> {
  try {
    const response = await conversationApi.getConversations();
    return response.data as unknown as GetConversationsResponse;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        statusText;
      throw new Error(`대화 목록 조회 실패: ${status} ${errorMessage}`);
    } else if (error.request) {
      throw new Error('서버에 연결할 수 없습니다.');
    } else {
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.');
    }
  }
}

/**
 * 특정 대화 조회 (메시지 포함)
 */
export async function getConversation(
  id: string
): Promise<GetConversationResponse> {
  try {
    const response = await conversationApi.getConversation({ id });
    return response.data as unknown as GetConversationResponse;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        statusText;
      throw new Error(`대화 조회 실패: ${status} ${errorMessage}`);
    } else if (error.request) {
      throw new Error('서버에 연결할 수 없습니다.');
    } else {
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.');
    }
  }
}

/**
 * 대화 제목 업데이트
 */
export async function updateConversationTitle(
  id: string,
  title: string
): Promise<UpdateConversationTitleResponse> {
  try {
    const updateConversationTitleDto: UpdateConversationTitleDto = { title };
    const response = await conversationApi.updateConversationTitle({
      id,
      updateConversationTitleDto,
    });
    return response.data as unknown as UpdateConversationTitleResponse;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        statusText;
      throw new Error(`대화 제목 업데이트 실패: ${status} ${errorMessage}`);
    } else if (error.request) {
      throw new Error('서버에 연결할 수 없습니다.');
    } else {
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.');
    }
  }
}

/**
 * 대화 삭제
 */
export async function deleteConversation(
  id: string
): Promise<DeleteConversationResponse> {
  try {
    const response = await conversationApi.deleteConversation({ id });
    return response.data as unknown as DeleteConversationResponse;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        statusText;
      throw new Error(`대화 삭제 실패: ${status} ${errorMessage}`);
    } else if (error.request) {
      throw new Error('서버에 연결할 수 없습니다.');
    } else {
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.');
    }
  }
}

/**
 * 대화 목록 조회 Hook
 */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await getConversations();
      return response.conversations;
    },
  });
}

/**
 * 특정 대화 조회 Hook
 */
export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await getConversation(id);
      return response.conversation;
    },
    enabled: !!id,
  });
}

/**
 * 새 대화 생성 Mutation Hook
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * 대화 제목 업데이트 Mutation Hook
 */
export function useUpdateConversationTitle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateConversationTitle(id, title),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({
        queryKey: ['conversation', variables.id],
      });
    },
  });
}

/**
 * 대화 삭제 Mutation Hook
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

