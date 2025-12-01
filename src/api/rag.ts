import { useMutation } from '@tanstack/react-query';
import { ragApi } from './client';
import type { QueryDto, ConversationMessage as GeneratedConversationMessage } from './generated/models';
import type { RAGQueryRequest, RAGQueryResponse, Message } from '../types/api';

/**
 * RAG 쿼리 요청
 * 생성된 OpenAPI 클라이언트를 사용하여 API 호출
 */
export async function queryRAG(request: RAGQueryRequest): Promise<RAGQueryResponse> {
  try {
    // 생성된 타입으로 변환 (role을 enum으로 변환)
    const queryDto: QueryDto = {
      question: request.question,
      projectId: request.projectId,
      conversationId: request.conversationId,
      conversationHistory: request.conversationHistory?.map((msg) => ({
        role: msg.role as GeneratedConversationMessage['role'],
        content: msg.content,
      })),
    };

    // 생성된 API 클라이언트 사용
    const response = await ragApi.query({ queryDto });
    
    // Axios 응답에서 데이터 추출 (응답 타입이 void로 되어 있지만 실제로는 데이터가 반환됨)
    return (response.data as unknown) as RAGQueryResponse;
  } catch (error: any) {
    // 에러 처리
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorMessage = error.response.data?.message || error.response.data?.error || statusText;
      throw new Error(`API 요청 실패: ${status} ${errorMessage}`);
    } else if (error.request) {
      throw new Error('서버에 연결할 수 없습니다.');
    } else {
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.');
    }
  }
}

/**
 * RAG 쿼리 Mutation Hook
 * 질문에 대한 답변을 생성하는 mutation
 */
export function useRAGQuery() {
  return useMutation<RAGQueryResponse, Error, RAGQueryRequest>({
    mutationFn: queryRAG,
  });
}

/**
 * RAG 쿼리 Mutation Hook (옵션 포함)
 * 추가 옵션을 설정할 수 있는 mutation
 */
export function useRAGQueryMutation(options?: {
  onSuccess?: (data: RAGQueryResponse, variables: RAGQueryRequest, context: Message) => void;
  onError?: (error: Error, variables: RAGQueryRequest, context: Message | undefined) => void;
  onMutate?: (variables: RAGQueryRequest) => Message | Promise<Message>;
}) {
  return useMutation<RAGQueryResponse, Error, RAGQueryRequest, Message>({
    mutationFn: queryRAG,
    ...options,
  });
}
