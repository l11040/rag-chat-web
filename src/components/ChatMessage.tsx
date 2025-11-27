import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message, Source, SwaggerSource } from '../types/api';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div 
      id={`message-${message.id}`}
      className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden hover:border-blue-500/50 hover:shadow-blue-500/20 transition-all duration-200"
      style={{ isolation: 'isolate' }}
    >
      {/* Question Section */}
      <div className="px-6 py-5 bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-b border-slate-700/50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
            <span className="text-blue-400 text-sm">Q</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-400 uppercase mb-2 tracking-wider">질문</div>
            <div className="text-slate-100 leading-relaxed font-medium break-words">{message.question}</div>
          </div>
        </div>
      </div>

      {/* Answer Section */}
      <div className="px-6 py-5 bg-transparent">
        {message.isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
              <span className="text-purple-400 text-sm">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-400 uppercase mb-3 tracking-wider">답변</div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm">답변을 생성하는 중...</span>
              </div>
            </div>
          </div>
        )}

        {message.error && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
              <span className="text-red-400 text-sm">!</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-red-400 uppercase mb-2 tracking-wider">오류</div>
              <div className="text-red-300 leading-relaxed break-words">{message.error}</div>
            </div>
          </div>
        )}

        {message.answer && !message.isLoading && (
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
              message.isSuccess === false 
                ? 'bg-amber-500/20' 
                : 'bg-purple-500/20'
            }`}>
              <span className={`text-sm ${
                message.isSuccess === false 
                  ? 'text-amber-400' 
                  : 'text-purple-400'
              }`}>A</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold uppercase mb-4 tracking-wider ${
                message.isSuccess === false 
                  ? 'text-amber-400' 
                  : 'text-slate-400'
              }`}>
                {message.isSuccess === false ? '⚠️ 답변 (정보 부족)' : '답변'}
              </div>
              <div className={`markdown-content ${
                message.isSuccess === false 
                  ? 'text-amber-200' 
                  : ''
              }`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      const codeString = String(children).replace(/\n$/, '');
                      
                      return !inline && (match || codeString.length > 50) ? (
                        <div className="code-block-container">
                          <div className="code-block-wrapper">
                            <SyntaxHighlighter
                              language={language || 'text'}
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                background: 'transparent',
                                fontSize: '0.875rem',
                                lineHeight: '1.6',
                                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                border: 'none',
                                borderRadius: 0,
                                boxShadow: 'none',
                              }}
                              PreTag="div"
                              showLineNumbers={codeString.split('\n').length > 5}
                              lineNumberStyle={{
                                minWidth: '3em',
                                paddingRight: '1em',
                                color: 'rgba(148, 163, 184, 0.5)',
                                userSelect: 'none',
                              }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      ) : (
                        <code
                          className="px-1.5 py-0.5 bg-slate-900/70 text-blue-300 rounded text-sm font-mono border border-slate-700/30"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.answer}
                </ReactMarkdown>
              </div>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (() => {
                if (message.queryType === 'swagger') {
                  // Swagger sources 처리
                  const swaggerSources = message.sources as SwaggerSource[];
                  // 같은 endpoint 중 유사도(score)가 가장 높은 것만 선택
                  const uniqueSources = swaggerSources.reduce((acc, source) => {
                    const existing = acc.find(s => s.endpoint === source.endpoint && s.method === source.method);
                    if (!existing || source.score > existing.score) {
                      if (existing) {
                        const index = acc.indexOf(existing);
                        acc[index] = source;
                      } else {
                        acc.push(source);
                      }
                    }
                    return acc;
                  }, [] as SwaggerSource[]);
                  
                  // 유사도 순으로 정렬
                  const sortedSources = [...uniqueSources].sort((a, b) => b.score - a.score);

                  return (
                    <div className="mt-6 pt-6 border-t border-slate-700/50">
                      <div className="text-xs font-semibold text-slate-400 uppercase mb-3 tracking-wider flex items-center gap-2">
                        <span>🔌</span>
                        <span>관련 API</span>
                      </div>
                      <div className="grid gap-2">
                        {sortedSources.map((source, index) => (
                          <div
                            key={index}
                            className="group flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-800/70 rounded-lg border border-slate-700/50 hover:border-purple-500/50 transition-all duration-200"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                  source.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                                  source.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                                  source.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                                  source.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                                  'bg-slate-500/20 text-slate-400'
                                }`}>
                                  {source.method}
                                </span>
                                <span className="text-purple-400 group-hover:text-purple-300 font-medium text-sm truncate">
                                  {source.endpoint}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                {source.path} • {source.swaggerKey}
                              </div>
                            </div>
                            <span className="text-xs text-slate-500 ml-3 flex-shrink-0">
                              {(source.score * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else {
                  // RAG sources 처리
                  const ragSources = message.sources as Source[];
                  // 같은 문서(pageUrl) 중 유사도(score)가 가장 높은 것만 선택
                  const uniqueSources = ragSources.reduce((acc, source) => {
                    const existing = acc.find(s => s.pageUrl === source.pageUrl);
                    if (!existing || source.score > existing.score) {
                      if (existing) {
                        const index = acc.indexOf(existing);
                        acc[index] = source;
                      } else {
                        acc.push(source);
                      }
                    }
                    return acc;
                  }, [] as Source[]);
                  
                  // 유사도 순으로 정렬
                  const sortedSources = [...uniqueSources].sort((a, b) => b.score - a.score);

                  return (
                    <div className="mt-6 pt-6 border-t border-slate-700/50">
                      <div className="text-xs font-semibold text-slate-400 uppercase mb-3 tracking-wider flex items-center gap-2">
                        <span>📚</span>
                        <span>관련 문서</span>
                      </div>
                      <div className="grid gap-2">
                        {sortedSources.map((source, index) => (
                          <a
                            key={index}
                            href={source.pageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="group flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-800/70 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-all duration-200"
                          >
                            <span className="text-blue-400 group-hover:text-blue-300 font-medium text-sm flex-1 truncate">
                              {source.pageTitle}
                            </span>
                            <span className="text-xs text-slate-500 ml-3 flex-shrink-0">
                              {(source.score * 100).toFixed(1)}%
                            </span>
                            <svg className="w-4 h-4 text-slate-500 ml-2 flex-shrink-0 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Usage */}
              {message.usage && (() => {
                // 비용 계산: 183,660 토큰 = 0.12 달러
                const TOKENS_PER_DOLLAR = 183660 / 0.12; // 토큰당 달러 비용
                const USD_TO_KRW = 1470; // 환율 (1달러 = 1,470원)
                const costInUSD = message.usage.totalTokens / TOKENS_PER_DOLLAR;
                const costInKRW = costInUSD * USD_TO_KRW;
                
                return (
                  <div className="mt-5 pt-5 border-t border-slate-700/50">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>💡</span>
                        <span className="font-semibold uppercase tracking-wider">토큰 사용량</span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-500">
                        <span className="text-xs">
                          프롬프트: <span className="text-slate-400">{message.usage.promptTokens.toLocaleString()}</span>
                        </span>
                        <span className="text-xs">
                          완성: <span className="text-slate-400">{message.usage.completionTokens.toLocaleString()}</span>
                        </span>
                        <span className="text-xs font-semibold">
                          총: <span className="text-blue-400">{message.usage.totalTokens.toLocaleString()}</span>
                          <span className="text-green-400 ml-2">({costInKRW.toFixed(2)}원)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

