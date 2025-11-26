import { useNavigate } from 'react-router-dom';
import type { TokenUsage } from '../api/tokenUsage';

interface TokenUsageTableProps {
  data: TokenUsage[];
  pagination?: { limit: number; offset: number };
  onPaginationChange?: (pagination: { limit: number; offset: number }) => void;
}

export function TokenUsageTable({
  data,
  pagination,
  onPaginationChange,
}: TokenUsageTableProps) {
  const navigate = useNavigate();

  const handleConversationClick = (conversationId: string, messageId?: string) => {
    console.log('🔗 대화 클릭:', { conversationId, messageId });
    if (messageId) {
      navigate(`/?conversation=${conversationId}&message=${messageId}`);
    } else {
      navigate(`/?conversation=${conversationId}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
    }).format(date);
  };

  // data가 배열이 아닌 경우 빈 배열로 처리
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-xl font-semibold">토큰 사용 내역</h3>
        {safeData.length > 0 && (
          <p className="text-slate-400 text-sm mt-1">
            총 {safeData.length}개의 기록
          </p>
        )}
      </div>

      {safeData.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          사용 내역이 없습니다.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    날짜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    대화 ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    프롬프트 토큰
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    완성 토큰
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    총 토큰
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {safeData.map((usage) => (
                  <tr key={usage.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {formatDate(usage.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                      {usage.conversationId ? (
                        <button
                          onClick={() => handleConversationClick(usage.conversationId!, usage.messageId)}
                          className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors"
                          title={usage.messageId ? "해당 메시지로 이동" : "대화로 이동"}
                        >
                          {usage.conversationId.slice(0, 8)}...
                        </button>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                      {usage.promptTokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                      {usage.completionTokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-400 font-semibold">
                      {usage.totalTokens.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && onPaginationChange && (
            <div className="p-4 border-t border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                {pagination.offset + 1} - {pagination.offset + safeData.length} / 전체
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    onPaginationChange({
                      ...pagination,
                      offset: Math.max(0, pagination.offset - pagination.limit),
                    })
                  }
                  disabled={pagination.offset === 0}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  이전
                </button>
                <button
                  onClick={() =>
                    onPaginationChange({
                      ...pagination,
                      offset: pagination.offset + pagination.limit,
                    })
                  }
                  disabled={safeData.length < pagination.limit}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

