import { useState, FormEvent } from 'react';

interface ChatInputProps {
  onSend: (question: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onSend(question.trim());
      setQuestion('');
    }
  };

  return (
    <form className="w-full max-w-5xl mx-auto" onSubmit={handleSubmit}>
      <div className="relative bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder:text-slate-500 text-base resize-none min-h-[60px] max-h-[200px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="질문을 입력하세요..."
              rows={2}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold cursor-pointer transition-all duration-200 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap min-w-[100px] shadow-lg hover:shadow-blue-500/25 disabled:shadow-none flex items-center justify-center gap-2"
            disabled={!question.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>전송 중...</span>
              </>
            ) : (
              <>
                <span>전송</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </>
            )}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800/50 border border-slate-700/50 rounded text-xs">⌘</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800/50 border border-slate-700/50 rounded text-xs">Enter</kbd>
            <span className="ml-1">로 전송</span>
          </span>
          <span className="text-slate-600">{question.length}자</span>
        </div>
      </div>
    </form>
  );
}

