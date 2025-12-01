import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getTokenUsage,
  getTokenUsageStats,
  getTokenUsageByDateRange,
  type TokenUsage,
  type TokenUsageStats,
} from '../api/tokenUsage';
import { TokenUsageChart } from './TokenUsageChart';
import { TokenUsageTable } from './TokenUsageTable';
import { TokenUsageTimeChart } from './TokenUsageTimeChart';

type ViewType = 'overview' | 'list' | 'date-range' | 'conversation';

export function TokenUsageView() {
  const [viewType, setViewType] = useState<ViewType>('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });

  // 통계 조회
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['tokenUsageStats'],
    queryFn: getTokenUsageStats,
  });

  // 목록 조회
  const { data: usageList, isLoading: listLoading } = useQuery({
    queryKey: ['tokenUsage', pagination],
    queryFn: () => getTokenUsage(pagination),
    enabled: viewType === 'list',
  });

  // 날짜 범위 조회
  const { data: dateRangeData, isLoading: dateRangeLoading } = useQuery({
    queryKey: ['tokenUsageDateRange', dateRange],
    queryFn: () =>
      getTokenUsageByDateRange({
        startDate: new Date(dateRange.startDate).toISOString(),
        endDate: new Date(dateRange.endDate + 'T23:59:59').toISOString(),
      }),
    enabled: viewType === 'date-range',
  });

  return (
    <div className="space-y-6">
      {/* 뷰 타입 선택 탭 */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl inline-flex">
        <button
          onClick={() => setViewType('overview')}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
            viewType === 'overview'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          개요
        </button>
        <button
          onClick={() => setViewType('list')}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
            viewType === 'list'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          목록
        </button>
        <button
          onClick={() => setViewType('date-range')}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
            viewType === 'date-range'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          기간별 조회
        </button>
      </div>

      {/* 개요 뷰 */}
      {viewType === 'overview' && (
        <div className="space-y-6">
          {/* 에러 메시지 */}
          {statsError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-sm">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                통계 데이터를 불러오는데 실패했습니다: {statsError instanceof Error ? statsError.message : '알 수 없는 오류'}
              </p>
            </div>
          )}
          
          {/* 통계 카드 */}
          {statsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 dark:text-slate-400 text-sm mb-2 font-medium">총 프롬프트 토큰</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(stats.totalPromptTokens ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 dark:text-slate-400 text-sm mb-2 font-medium">총 완성 토큰</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {(stats.totalCompletionTokens ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 dark:text-slate-400 text-sm mb-2 font-medium">전체 토큰 수</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {(stats.totalTokens ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 dark:text-slate-400 text-sm mb-2 font-medium">사용 횟수</div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {(stats.usageCount ?? 0).toLocaleString()}
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                  평균: {Math.round(stats.averageTokens ?? 0).toLocaleString()} 토큰
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center shadow-sm border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">통계 데이터를 불러올 수 없습니다.</p>
            </div>
          )}

          {/* 차트 */}
          {stats && <TokenUsageChart stats={stats} />}
        </div>
      )}

      {/* 목록 뷰 */}
      {viewType === 'list' && (
        <div>
          {listLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : usageList ? (
            <TokenUsageTable
              data={usageList}
              pagination={pagination}
              onPaginationChange={setPagination}
            />
          ) : null}
        </div>
      )}

      {/* 기간별 조회 뷰 */}
      {viewType === 'date-range' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  시작일
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, startDate: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  종료일
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, endDate: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {dateRangeLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : dateRangeData ? (
            <div className="space-y-6">
              <TokenUsageTimeChart data={dateRangeData} />
              <TokenUsageTable data={dateRangeData} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

