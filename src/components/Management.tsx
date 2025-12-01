import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TokenUsageView } from './TokenUsageView';
import { Projects } from './Projects';

type MenuType = 'token-usage' | 'projects';

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
  {
    id: 'projects',
    label: '프로젝트 관리',
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
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      <div className="flex">
        {/* 좌측 사이드바 - Sticky */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen flex flex-col">
          {/* 사이드바 헤더 */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">설정</h2>
          </div>

          {/* 사이드바 메뉴 */}
          <nav className="flex-1 py-4">
            {menuItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full relative flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 rounded-xl mx-2 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span className={`font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* 사이드바 푸터 */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-500 mb-1 font-medium">현재 사용자</div>
            <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{user?.email}</div>
          </div>
        </aside>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* 헤더 */}
          <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-10 px-8 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {menuItems.find((item) => item.id === activeMenu)?.label || '관리 페이지'}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                >
                  채팅으로
                </button>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </header>

          {/* 컨텐츠 영역 */}
          <main className="flex-1 bg-slate-50 dark:bg-slate-900 p-8">
            {activeMenu === 'token-usage' && <TokenUsageView />}
            {activeMenu === 'projects' && <Projects />}
          </main>
        </div>
      </div>
    </div>
  );
}
