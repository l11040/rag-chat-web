import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TokenUsageView } from './TokenUsageView';

type MenuType = 'token-usage';

interface MenuItem {
  id: MenuType;
  label: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  {
    id: 'token-usage',
    label: '토큰 사용량',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export function Management() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<MenuType>('token-usage');

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="flex">
        {/* 좌측 사이드바 - Sticky */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 sticky top-0 h-screen flex flex-col">
          {/* 사이드바 헤더 */}
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-slate-200">설정</h2>
          </div>

          {/* 사이드바 메뉴 */}
          <nav className="flex-1 py-4">
            {menuItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full relative flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  {/* 활성화 표시 바 */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r"></div>
                  )}
                  <div
                    className={`flex-shrink-0 ${
                      isActive ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span className={`font-medium ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* 사이드바 푸터 */}
          <div className="p-6 border-t border-slate-700">
            <div className="text-sm text-slate-400 mb-2">현재 사용자</div>
            <div className="font-medium text-slate-200">{user?.email}</div>
          </div>
        </aside>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* 헤더 */}
          <header className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/50 sticky top-0 z-10 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {menuItems.find((item) => item.id === activeMenu)?.label || '관리 페이지'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">시스템 관리 및 통계</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  채팅으로 돌아가기
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </header>

          {/* 컨텐츠 영역 */}
          <main className="flex-1 bg-slate-900 p-8">
            {activeMenu === 'token-usage' && <TokenUsageView />}
          </main>
        </div>
      </div>
    </div>
  );
}
