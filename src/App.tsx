import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryRAG } from './api/rag';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import type { Message } from './types/api';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);

  const mutation = useMutation({
    mutationFn: queryRAG,
    onMutate: async (variables) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        question: variables.question,
        isLoading: true,
      };
      setMessages((prev) => [...prev, newMessage]);
      return newMessage;
    },
    onSuccess: (data, variables, context) => {
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
                error: undefined, // success: false인 경우 answer에 메시지가 있으므로 error는 사용하지 않음
              }
            : msg
        )
      );
    },
    onError: (error, variables, context) => {
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
    const conversationHistory = buildConversationHistory(messages);
    mutation.mutate({ question, conversationHistory });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/50 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent text-center">
            RAG Chat Web
          </h1>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto py-6 px-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-6 pr-2">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
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
          </div>
          <ChatInput onSend={handleSend} isLoading={mutation.isPending} />
        </div>
      </main>
    </div>
  );
}

export default App;

