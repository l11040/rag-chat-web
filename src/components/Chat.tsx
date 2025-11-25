import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRAGQueryMutation } from '../api/rag';
import { useConversation } from '../api/conversations';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useAuth } from '../contexts/AuthContext';
import type { Message } from '../types/api';

interface ChatProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

export function Chat({ conversationId, onConversationCreated }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: conversation, isLoading: isLoadingConversation } = useConversation(conversationId);

  // 대화 변경 시 메시지 로드
  useEffect(() => {
    if (conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId);
    }

    if (conversationId && conversation) {
      // 대화 메시지를 Message 형식으로 변환
      const loadedMessages: Message[] = [];
      let currentUserMessage: Message | null = null;

      conversation.messages.forEach((msg) => {
        if (msg.role === 'user') {
          if (currentUserMessage) {
            loadedMessages.push(currentUserMessage);
          }
          currentUserMessage = {
            id: msg.id,
            question: msg.content,
            isLoading: false,
          };
        } else if (msg.role === 'assistant' && currentUserMessage) {
          // metadata에서 sources와 usage 추출
          const metadata = msg.metadata;
          currentUserMessage.answer = msg.content;
          currentUserMessage.isSuccess = true;
          if (metadata?.sources) {
            currentUserMessage.sources = metadata.sources;
          }
          if (metadata?.usage) {
            currentUserMessage.usage = metadata.usage;
          }
          loadedMessages.push(currentUserMessage);
          currentUserMessage = null;
        }
      });

      // 마지막 사용자 메시지가 답변을 기다리는 경우
      if (currentUserMessage) {
        loadedMessages.push(currentUserMessage);
      }

      setMessages(loadedMessages);
    } else if (!conversationId) {
      // 새 대화인 경우 메시지 초기화
      setMessages([]);
    }
  }, [conversationId, conversation, currentConversationId]);

  const mutation = useRAGQueryMutation({
    onMutate: async (variables) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        question: variables.question,
        isLoading: true,
      };
      setMessages((prev) => [...prev, newMessage]);
      return newMessage;
    },
    onSuccess: (data, _variables, context) => {
      // conversationId 업데이트
      if (data.conversationId) {
        const isNewConversation = !currentConversationId;
        setCurrentConversationId(data.conversationId);
        
        // 새 대화가 생성된 경우 대화 목록 새로고침 및 부모 컴포넌트에 알림
        if (isNewConversation) {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          onConversationCreated?.(data.conversationId);
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === context.id
            ? {
                ...msg,
                answer: data.answer || '답변을 생성할 수 없습니다.',
                sources: data.sources || [],
                usage: data.usage,
                isLoading: false,
                isSuccess: data.success,
                error: undefined,
              }
            : msg
        )
      );
    },
    onError: (error, _variables, context) => {
      if (!context) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === context.id
            ? {
                ...msg,
                error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
                isLoading: false,
              }
            : msg
        )
      );
    },
  });

  const buildConversationHistory = (currentMessages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> => {
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    currentMessages.forEach((msg) => {
      if (msg.question) {
        history.push({ role: 'user', content: msg.question });
      }
      if (msg.answer && !msg.isLoading && !msg.error) {
        history.push({ role: 'assistant', content: msg.answer });
      }
    });
    
    return history;
  };

  const handleSend = (question: string) => {
    // conversationId가 있으면 사용하고, 없으면 conversationHistory 사용
    if (currentConversationId) {
      mutation.mutate({ question, conversationId: currentConversationId });
    } else {
      const conversationHistory = buildConversationHistory(messages);
      mutation.mutate({ question, conversationHistory });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="fixed top-0 left-64 right-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/50 px-6 py-5 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            RAG Chat Web
          </h1>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-slate-300 text-sm">
                {user.email}
              </span>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                관리자 페이지
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="flex flex-col max-w-5xl w-full mx-auto py-6 px-4 pt-24 pb-52">
        {isLoadingConversation ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 text-lg font-medium">대화를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-slate-400 text-lg font-medium">질문을 입력하여 시작하세요</p>
                  <p className="text-slate-500 text-sm mt-2">RAG 기반 지식 검색 챗봇</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <div className="fixed bottom-0 left-64 right-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <ChatInput onSend={handleSend} isLoading={mutation.isPending} />
        </div>
      </div>
    </div>
  );
}

