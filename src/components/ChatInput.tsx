import { useState, FormEvent, useRef, useEffect } from 'react';

export type QueryType = 'rag' | 'swagger';

interface ChatInputProps {
  onSend: (question: string, queryType: QueryType) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [question, setQuestion] = useState('');
  const [queryType, setQueryType] = useState<QueryType>('rag');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onSend(question.trim(), queryType);
      setQuestion('');
      // 텍스트 초기화 후 높이 리셋
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    // 자동 높이 조절
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = textareaRef.current.scrollHeight;
      // max-height를 넘으면 스크롤 표시, 아니면 숨김
      if (newHeight > 150) {
        textareaRef.current.style.height = '150px';
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.height = `${newHeight}px`;
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  };

  // 초기 높이 설정 (44px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      textareaRef.current.style.overflowY = 'hidden';
    }
  }, []);

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg p-4">
        {/* Query Type Selector with Guide */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">검색 타입:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setQueryType('rag')}
                disabled={isLoading}
                className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  queryType === 'rag'
                    ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/50 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                📄 문서 검색
              </button>
              <button
                type="button"
                onClick={() => setQueryType('swagger')}
                disabled={isLoading}
                className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  queryType === 'swagger'
                    ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/50 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                🔌 Swagger API
              </button>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded text-xs">⌘</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded text-xs">Enter</kbd>
            <span className="ml-1 text-slate-500 dark:text-slate-500">로 전송</span>
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm resize-none min-h-[44px] max-h-[150px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-y-hidden"
              value={question}
              onChange={handleTextareaChange}
              placeholder={queryType === 'swagger' ? "Swagger API에 대해 질문하세요..." : "질문을 입력하세요..."}
              rows={1}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e);
                }
              }}
              style={{ overflowY: 'auto' }}
            />
          </div>
          <button
            type="submit"
            className="w-11 h-11 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white cursor-pointer transition-all duration-200 disabled:from-slate-300 dark:disabled:from-slate-600 disabled:to-slate-300 dark:disabled:to-slate-600 disabled:cursor-not-allowed disabled:opacity-50 shadow-md hover:shadow-lg hover:shadow-blue-500/25 disabled:shadow-none flex items-center justify-center flex-shrink-0"
            disabled={!question.trim() || isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

