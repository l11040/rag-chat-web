import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { defaultApi, ragApi } from '../api/client';
import { UpdateUserDtoRoleEnum, type UpdateUserDto, type UpdatePageDto, type UpdatePagesDto } from '../api/generated/models';

interface User {
  id: string;
  email: string;
  role?: UpdateUserDtoRoleEnum;
  createdAt?: string;
  updatedAt?: string;
}

interface NotionPage {
  id: string;
  pageId: string;
  title?: string;
  databaseId?: string;
  url?: string;
  lastSyncedAt?: string;
  lastUpdatedAt?: string;
  updatedAt?: string;
  syncedAt?: string;
  lastSyncAt?: string;
  createdAt?: string;
  status?: string;
  [key: string]: any; // 추가 필드 허용
}

type TabType = 'users' | 'notion';

// 날짜를 한국 시간(KST)으로 변환하는 함수
const formatToKST = (dateValue: string | undefined): string => {
  if (!dateValue) return '-';
  
  try {
    // ISO 8601 형식의 날짜 문자열을 파싱
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    
    // Intl.DateTimeFormat을 사용하여 한국 시간대로 명시적으로 변환
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    
    return formatter.format(date);
  } catch (e) {
    return dateValue;
  }
};

// 노션 페이지 URL 가져오기 함수
const getNotionPageUrl = (page: NotionPage): string => {
  // 서버에서 제공하는 URL이 있으면 사용
  if (page.url) {
    return page.url;
  }
  
  // URL이 없으면 pageId로 생성 (fallback)
  const pageId = page.pageId || page.id;
  let formattedPageId = pageId;
  
  // 하이픈이 없는 32자리 UUID인 경우 하이픈 추가
  if (pageId.length === 32 && !pageId.includes('-')) {
    formattedPageId = `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20, 32)}`;
  }
  
  return `https://www.notion.so/${formattedPageId}`;
};

export function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // 사용자 관리 상태
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserDto>({
    email: '',
    password: '',
    role: undefined,
  });

  // 노션 관리 상태
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [databaseId, setDatabaseId] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateResult, setUpdateResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'notion') {
      fetchPages();
    }
  }, [activeTab]);

  // 사용자 관리 함수들
  const fetchUsers = async () => {
    try {
      setUserLoading(true);
      setError(null);
      const response = await defaultApi.getAllUsers();
      
      let userList: User[] = [];
      
      if (Array.isArray(response.data)) {
        userList = response.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        userList = response.data.users;
      } else if (response.data && Array.isArray(response.data.data)) {
        userList = response.data.data;
      } else if (response.data && typeof response.data === 'object') {
        const values = Object.values(response.data);
        if (values.length > 0 && Array.isArray(values[0])) {
          userList = values[0] as User[];
        }
      }
      
      setUsers(userList);
    } catch (err: any) {
      console.error('사용자 목록 가져오기 실패:', err);
      setError(err.response?.data?.message || '사용자 목록을 가져오는데 실패했습니다.');
    } finally {
      setUserLoading(false);
    }
  };

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditForm({
      email: userToEdit.email || '',
      password: '',
      role: userToEdit.role,
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({
      email: '',
      password: '',
      role: undefined,
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setError(null);
      const updateData: UpdateUserDto = {
        ...editForm,
      };

      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password;
      }

      await defaultApi.updateUser({
        id: editingUser.id,
        updateUserDto: updateData,
      });

      await fetchUsers();
      handleCancelEdit();
    } catch (err: any) {
      console.error('사용자 업데이트 실패:', err);
      setError(err.response?.data?.message || '사용자 정보를 업데이트하는데 실패했습니다.');
    }
  };

  // 노션 관리 함수들
  const fetchPages = async () => {
    try {
      setPageLoading(true);
      setError(null);
      const response = await ragApi.getPages({ databaseId: databaseId || '' });
      
      let pageList: NotionPage[] = [];
      const data = (response.data as any);
      
      if (Array.isArray(data)) {
        pageList = data;
      } else if (data && Array.isArray(data.pages)) {
        pageList = data.pages;
      } else if (data && Array.isArray(data.data)) {
        pageList = data.data;
      } else if (data && typeof data === 'object') {
        const values = Object.values(data);
        if (values.length > 0 && Array.isArray(values[0])) {
          pageList = values[0] as NotionPage[];
        }
      }
      
      setPages(pageList);
    } catch (err: any) {
      console.error('페이지 목록 가져오기 실패:', err);
      setError(err.response?.data?.message || '페이지 목록을 가져오는데 실패했습니다.');
    } finally {
      setPageLoading(false);
    }
  };

  const handleSyncPages = async () => {
    try {
      setSyncing(true);
      setError(null);
      await ragApi.syncPages({
        ingestDto: databaseId ? { databaseId } : {},
      });
      await fetchPages();
    } catch (err: any) {
      console.error('페이지 동기화 실패:', err);
      setError(err.response?.data?.message || '페이지 동기화에 실패했습니다.');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdatePage = async (pageId: string | undefined) => {
    if (!pageId) {
      setError('페이지 ID가 없습니다.');
      return;
    }

    try {
      setUpdating(pageId);
      setError(null);
      const updatePageDto: UpdatePageDto = { pageId: String(pageId) };
      await ragApi.updatePage({ updatePageDto });
      await fetchPages();
      
      // 성공 모달 표시
      setUpdateResult({
        show: true,
        success: true,
        message: '페이지가 벡터 DB에 성공적으로 업데이트되었습니다.',
        count: 1,
      });
    } catch (err: any) {
      console.error('페이지 업데이트 실패:', err);
      const errorMessage = err.response?.data?.message || '페이지 업데이트에 실패했습니다.';
      setError(errorMessage);
      
      // 실패 모달 표시
      setUpdateResult({
        show: true,
        success: false,
        message: errorMessage,
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdatePages = async () => {
    if (selectedPages.size === 0) {
      setError('선택된 페이지가 없습니다.');
      return;
    }

    const pageCount = selectedPages.size;
    try {
      setUpdating('batch');
      setError(null);
      const updatePagesDto: UpdatePagesDto = {
        pageIds: Array.from(selectedPages),
      };
      await ragApi.updatePages({ updatePagesDto });
      setSelectedPages(new Set());
      await fetchPages();
      
      // 성공 모달 표시
      setUpdateResult({
        show: true,
        success: true,
        message: `${pageCount}개의 페이지가 벡터 DB에 성공적으로 업데이트되었습니다.`,
        count: pageCount,
      });
    } catch (err: any) {
      console.error('페이지 일괄 업데이트 실패:', err);
      const errorMessage = err.response?.data?.message || '페이지 일괄 업데이트에 실패했습니다.';
      setError(errorMessage);
      
      // 실패 모달 표시
      setUpdateResult({
        show: true,
        success: false,
        message: errorMessage,
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateAll = async () => {
    try {
      setUpdating('all');
      setError(null);
      const response = await ragApi.updateAll({
        ingestDto: databaseId ? { databaseId } : {},
      });
      await fetchPages();
      
      // 성공 모달 표시
      const data = (response.data as any);
      const updatedCount = data?.count || data?.updatedCount || pages.length;
      setUpdateResult({
        show: true,
        success: true,
        message: `전체 ${updatedCount}개의 페이지가 벡터 DB에 성공적으로 업데이트되었습니다.`,
        count: updatedCount,
      });
    } catch (err: any) {
      console.error('전체 업데이트 실패:', err);
      const errorMessage = err.response?.data?.message || '전체 업데이트에 실패했습니다.';
      setError(errorMessage);
      
      // 실패 모달 표시
      setUpdateResult({
        show: true,
        success: false,
        message: errorMessage,
      });
    } finally {
      setUpdating(null);
    }
  };

  const togglePageSelection = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPages.size === pages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(pages.map(p => String(p.pageId || p.id))));
    }
  };

  const getRoleLabel = (role?: UpdateUserDtoRoleEnum) => {
    switch (role) {
      case UpdateUserDtoRoleEnum.admin:
        return '관리자';
      case UpdateUserDtoRoleEnum.sub_admin:
        return '서브 관리자';
      case UpdateUserDtoRoleEnum.project_manager:
        return '프로젝트 매니저';
      case UpdateUserDtoRoleEnum.user:
        return '사용자';
      default:
        return '미지정';
    }
  };

  const getRoleColor = (role?: UpdateUserDtoRoleEnum) => {
    switch (role) {
      case UpdateUserDtoRoleEnum.admin:
        return 'bg-red-500';
      case UpdateUserDtoRoleEnum.sub_admin:
        return 'bg-orange-500';
      case UpdateUserDtoRoleEnum.project_manager:
        return 'bg-blue-500';
      case UpdateUserDtoRoleEnum.user:
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">관리자 페이지</h1>
            <p className="text-slate-400">시스템 관리 및 설정</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">현재 사용자</p>
              <p className="font-semibold">{user?.email}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              채팅으로 돌아가기
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="mb-6 border-b border-slate-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              사용자 관리
            </button>
            <button
              onClick={() => setActiveTab('notion')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'notion'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              노션 관리
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* 사용자 관리 탭 */}
        {activeTab === 'users' && (
          <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">사용자 목록</h2>
                <button
                  onClick={fetchUsers}
                  disabled={userLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {userLoading ? '새로고침 중...' : '새로고침'}
                </button>
              </div>
            </div>

            {userLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-400">로딩 중...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                사용자가 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        이메일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        권한
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        생성일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {u.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getRoleColor(
                              u.role
                            )}`}
                          >
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEdit(u)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            수정
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 노션 관리 탭 */}
        {activeTab === 'notion' && (
          <div className="space-y-6">
            {/* 액션 버튼 영역 */}
            <div className="bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">노션 페이지 관리</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    데이터베이스 ID (선택사항)
                  </label>
                  <input
                    type="text"
                    value={databaseId}
                    onChange={(e) => setDatabaseId(e.target.value)}
                    placeholder="데이터베이스 ID를 입력하세요"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSyncPages}
                      disabled={syncing || updating !== null}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                      title="Notion에서 페이지 목록을 가져와 메타데이터만 DB에 저장합니다. 벡터 DB에는 업데이트하지 않습니다."
                    >
                      {syncing ? '동기화 중...' : 'Notion 목록 가져오기'}
                    </button>
                    <button
                      onClick={fetchPages}
                      disabled={pageLoading || updating !== null}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {pageLoading ? '로딩 중...' : '목록 새로고침'}
                    </button>
                    <button
                      onClick={handleUpdateAll}
                      disabled={updating !== null}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                      title="모든 페이지를 벡터 DB에 업데이트합니다."
                    >
                      {updating === 'all' ? '업데이트 중...' : '전체 벡터 DB 업데이트'}
                    </button>
                    {selectedPages.size > 0 && (
                      <button
                        onClick={handleUpdatePages}
                        disabled={updating !== null}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                        title="선택한 페이지들을 벡터 DB에 업데이트합니다."
                      >
                        {updating === 'batch' ? '업데이트 중...' : `선택한 ${selectedPages.size}개 벡터 DB 업데이트`}
                      </button>
                    )}
                  </div>
                  {updating !== null && (
                    <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                      <p className="text-yellow-300 text-sm">
                        ⚠️ 벡터 DB 업데이트가 진행 중입니다. 다른 작업을 수행할 수 없습니다.
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400">
                    💡 <strong>Notion 목록 가져오기</strong>: Notion에서 페이지 목록을 가져와 메타데이터만 저장합니다. 
                    <strong>벡터 DB 업데이트</strong>: 실제로 벡터 DB에 임베딩을 추가합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 페이지 목록 */}
            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">페이지 목록</h2>
                  {pages.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      disabled={updating !== null}
                      className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 rounded-lg transition-colors"
                    >
                      {selectedPages.size === pages.length ? '전체 해제' : '전체 선택'}
                    </button>
                  )}
                </div>
              </div>

              {pageLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">로딩 중...</p>
                </div>
              ) : pages.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="mb-2">페이지가 없습니다.</p>
                  <p className="text-sm">먼저 "Notion 목록 가져오기" 버튼을 클릭하여 페이지 목록을 가져오세요.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedPages.size === pages.length && pages.length > 0}
                            onChange={toggleSelectAll}
                            disabled={updating !== null}
                            className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          페이지 ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          제목
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          데이터베이스 ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          벡터 DB 업데이트
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {pages.map((page) => {
                        const currentPageId = String(page.pageId || page.id);
                        return (
                        <tr key={page.id || page.pageId} className="hover:bg-slate-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedPages.has(String(page.pageId || page.id))}
                              onChange={() => togglePageSelection(String(page.pageId || page.id))}
                              disabled={updating !== null}
                              className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                            <a
                              href={getNotionPageUrl(page)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {page.pageId || page.id}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <a
                              href={getNotionPageUrl(page)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {page.title || '-'}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                            {page.databaseId || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                            {formatToKST(
                              // 벡터 DB 업데이트 날짜를 우선적으로 표시
                              page.updatedAt || 
                              page.lastUpdatedAt || 
                              // 동기화 날짜는 fallback
                              page.lastSyncedAt || 
                              page.syncedAt || 
                              page.lastSyncAt ||
                              page.createdAt
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleUpdatePage(currentPageId)}
                              disabled={updating !== null}
                              className="text-blue-400 hover:text-blue-300 disabled:text-slate-600 transition-colors"
                              title="이 페이지를 벡터 DB에 업데이트합니다."
                            >
                              {updating === currentPageId ? '업데이트 중...' : '벡터 DB 업데이트'}
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 업데이트 결과 모달 */}
        {updateResult?.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-4 mb-4">
                {updateResult.success ? (
                  <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className={`text-xl font-semibold ${updateResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {updateResult.success ? '업데이트 완료' : '업데이트 실패'}
                  </h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-slate-300 mb-2">{updateResult.message}</p>
                {updateResult.success && updateResult.count !== undefined && (
                  <p className="text-sm text-slate-400">
                    업데이트된 페이지 수: <span className="font-semibold text-blue-400">{updateResult.count}개</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setUpdateResult(null)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 사용자 수정 모달 */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">사용자 정보 수정</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    비밀번호 (변경하지 않으려면 비워두세요)
                  </label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    권한
                  </label>
                  <select
                    value={editForm.role || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        role: e.target.value as UpdateUserDtoRoleEnum,
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">권한 선택</option>
                    <option value={UpdateUserDtoRoleEnum.user}>사용자</option>
                    <option value={UpdateUserDtoRoleEnum.project_manager}>
                      프로젝트 매니저
                    </option>
                    <option value={UpdateUserDtoRoleEnum.sub_admin}>
                      서브 관리자
                    </option>
                    <option value={UpdateUserDtoRoleEnum.admin}>관리자</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleUpdateUser}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
