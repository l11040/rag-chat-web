import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { defaultApi } from '../api/client';
import { UpdateUserDtoRoleEnum, type UpdateUserDto } from '../api/generated/models';

interface User {
  id: string;
  email: string;
  role?: UpdateUserDtoRoleEnum;
  createdAt?: string;
  updatedAt?: string;
}

export function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserDto>({
    email: '',
    password: '',
    role: undefined,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await defaultApi.getAllUsers();
      
      // 다양한 응답 구조 처리
      let userList: User[] = [];
      
      if (Array.isArray(response.data)) {
        // 직접 배열인 경우
        userList = response.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        // { users: [...] } 형태
        userList = response.data.users;
      } else if (response.data && Array.isArray(response.data.data)) {
        // { data: [...] } 형태
        userList = response.data.data;
      } else if (response.data && typeof response.data === 'object') {
        // 객체의 값이 배열인 경우
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
      setLoading(false);
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

      // 비밀번호가 비어있으면 업데이트하지 않음
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password;
      }

      await defaultApi.updateUser({
        id: editingUser.id,
        updateUserDto: updateData,
      });

      // 성공 시 목록 새로고침
      await fetchUsers();
      handleCancelEdit();
    } catch (err: any) {
      console.error('사용자 업데이트 실패:', err);
      setError(err.response?.data?.message || '사용자 정보를 업데이트하는데 실패했습니다.');
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
            <p className="text-slate-400">사용자 관리 및 권한 설정</p>
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

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* 사용자 목록 */}
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">사용자 목록</h2>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {loading ? '새로고침 중...' : '새로고침'}
              </button>
            </div>
          </div>

          {loading ? (
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

        {/* 수정 모달 */}
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

