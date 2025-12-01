import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRAGQueryMutation } from '../api/rag';
import { useSwaggerQueryMutation } from '../api/swagger';
import { useConversation } from '../api/conversations';
import { ChatMessage } from './ChatMessage';
import { ChatInput, type QueryType } from './ChatInput';
import { useAuth } from '../contexts/AuthContext';
import type { Message } from '../types/api';

interface ChatProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
  projectId?: string | null;
}

export function Chat({ conversationId, onConversationCreated, projectId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: conversation, isLoading: isLoadingConversation } = useConversation(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageIdFromUrl = searchParams.get('message');
  const hasInitialScrolled = useRef(false);

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
          // assistant 메시지의 ID를 메시지 ID로 사용 (TokenUsage의 messageId와 매칭)
          currentUserMessage.id = msg.id;
          if (metadata?.sources) {
            currentUserMessage.sources = metadata.sources;
            // sources 타입을 확인하여 queryType 추론
            if (metadata.sources.length > 0) {
              const firstSource = metadata.sources[0];
              // Swagger source는 endpoint와 method 속성을 가짐
              if ('endpoint' in firstSource && 'method' in firstSource) {
                currentUserMessage.queryType = 'swagger';
              } else {
                currentUserMessage.queryType = 'rag';
              }
            }
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

      // 기존 로딩 중인 메시지가 있으면 보존 (서버 데이터에는 아직 없을 수 있음)
      setMessages((prev) => {
        const loadingMessages = prev.filter(msg => msg.isLoading);
        // 로딩 중인 메시지가 있고, 현재 대화와 관련이 있는 경우에만 보존
        // 로드된 메시지 ID와 중복되지 않는 로딩 메시지만 보존
        if (loadingMessages.length > 0) {
          const loadedMessageIds = new Set(loadedMessages.map(msg => msg.id));
          const preservedLoadingMessages = loadingMessages.filter(
            msg => !loadedMessageIds.has(msg.id)
          );
          // 로드된 메시지와 로딩 중인 메시지를 병합
          // 로딩 중인 메시지는 항상 마지막에 유지
          return [...loadedMessages, ...preservedLoadingMessages];
        }
        return loadedMessages;
      });
      // 초기 스크롤 플래그 리셋
      hasInitialScrolled.current = false;
    } else if (!conversationId) {
      // 새 대화인 경우 메시지 초기화
      setMessages([]);
      hasInitialScrolled.current = false;
    }
  }, [conversationId, conversation, currentConversationId]);

  // 1단계: 처음 메시지가 로드되면 즉시 맨 아래로 (애니메이션 없음)
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current && messagesEndRef.current) {
      // 즉시 맨 아래로 스크롤 (애니메이션 없음)
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      hasInitialScrolled.current = true;
    }
  }, [messages.length]);

  // 2단계: message 파라미터가 있으면 해당 메시지로 이동 (초기 스크롤 후)
  useEffect(() => {
    if (messageIdFromUrl && messages.length > 0) {
      console.log('🔍 메시지로 이동 시도:', {
        messageIdFromUrl,
        messagesCount: messages.length,
        messageIds: messages.map(m => m.id)
      });

      // 초기 스크롤이 완료될 때까지 대기
      const checkAndScroll = () => {
        if (!hasInitialScrolled.current) {
          setTimeout(checkAndScroll, 50);
          return;
        }

        const scrollToMessage = () => {
          const targetElement = document.getElementById(`message-${messageIdFromUrl}`);
          console.log('🎯 스크롤 대상 요소 찾기:', {
            messageIdFromUrl,
            found: !!targetElement,
            elementId: targetElement?.id
          });
          
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // 하이라이트 효과를 위한 클래스 추가
            targetElement.classList.add('ring-2', 'ring-blue-500');
            setTimeout(() => {
              targetElement.classList.remove('ring-2', 'ring-blue-500');
            }, 2000);
            console.log('✅ 메시지로 스크롤 완료');
            return true;
          }
          return false;
        };

        // 즉시 시도
        if (!scrollToMessage()) {
          // 요소가 아직 없으면 재시도 (최대 20번, 200ms 간격)
          let retryCount = 0;
          const maxRetries = 20;
          const retryInterval = setInterval(() => {
            retryCount++;
            const found = scrollToMessage();
            if (found || retryCount >= maxRetries) {
              if (!found && retryCount >= maxRetries) {
                console.warn('⚠️ 메시지를 찾을 수 없습니다:', messageIdFromUrl);
              }
              clearInterval(retryInterval);
            }
          }, 200);
        }
      };

      checkAndScroll();
    }
  }, [messageIdFromUrl, messages.length]);

  // 메시지가 변경될 때마다 맨 아래로 스크롤 (message 파라미터가 없고, 초기 스크롤 이후)
  useEffect(() => {
    // message 파라미터가 있거나 아직 초기 스크롤이 안 되었으면 자동 스크롤하지 않음
    if (messageIdFromUrl || !hasInitialScrolled.current) {
      return;
    }

    if (messages.length > 0 && messagesEndRef.current) {
      // 약간의 지연을 두어 DOM 업데이트 후 스크롤
      setTimeout(() => {
        if (messagesEndRef.current && !messageIdFromUrl) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    }
  }, [messages, messageIdFromUrl]);

  const ragMutation = useRAGQueryMutation({
    onMutate: async (variables) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        question: variables.question,
        isLoading: true,
        queryType: 'rag',
      };
      setMessages((prev) => [...prev, newMessage]);
      // URL에서 message 파라미터 제거 (새 메시지 전송 시)
      if (messageIdFromUrl) {
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('message');
          return newParams;
        });
      }
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
                queryType: 'rag',
              }
            : msg
        )
      );
      // 답변 완료 후 맨 아래로 스크롤 (message 파라미터가 없을 때만)
      if (!searchParams.get('message')) {
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
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

  const swaggerMutation = useSwaggerQueryMutation({
    onMutate: async (variables) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        question: variables.question,
        isLoading: true,
        queryType: 'swagger',
      };
      setMessages((prev) => [...prev, newMessage]);
      // URL에서 message 파라미터 제거 (새 메시지 전송 시)
      if (messageIdFromUrl) {
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('message');
          return newParams;
        });
      }
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
                queryType: 'swagger',
              }
            : msg
        )
      );
      // 답변 완료 후 맨 아래로 스크롤 (message 파라미터가 없을 때만)
      if (!searchParams.get('message')) {
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
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

  const handleSend = (question: string, queryType: QueryType) => {
    const conversationHistory = buildConversationHistory(messages);
    
    if (queryType === 'swagger') {
      // Swagger API 호출 (projectId는 Swagger 쿼리에서 지원하지 않을 수 있음)
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="fixed top-0 left-64 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-3 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            RAG Chat
          </h1>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {user.email}
              </span>
            )}
            <button
              onClick={() => navigate('/management')}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
              title="관리 페이지"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                관리자
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="flex flex-col max-w-5xl w-full mx-auto py-6 px-6 pt-20 pb-32">
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
                  <div className="text-5xl mb-6">💬</div>
                  <p className="text-slate-600 dark:text-slate-300 text-lg font-semibold mb-2">질문을 입력하여 시작하세요</p>
                  <p className="text-slate-500 dark:text-slate-500 text-sm">RAG 기반 지식 검색 챗봇</p>
                </div>
              </div>
            ) : (
              <div ref={messagesContainerRef} className="space-y-8">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}
      </main>
      <div className="fixed bottom-0 left-64 right-0 z-10 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pt-8 pb-4">
        <div className="max-w-5xl mx-auto px-6">
          <ChatInput onSend={handleSend} isLoading={ragMutation.isPending || swaggerMutation.isPending} />
        </div>
      </div>
    </div>
  );
}

