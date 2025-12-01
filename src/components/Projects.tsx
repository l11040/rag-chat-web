import { useState } from 'react';
import {
  useProjects,
  useProject,
  useProjectMembers,
  useUpdateProject,
  useDeleteProject,
  useAddProjectMember,
  useUpdateProjectMemberRole,
  useRemoveProjectMember,
  useAddProjectNotionPages,
  useRemoveProjectNotionPage,
  useAddProjectSwaggerDocuments,
  useRemoveProjectSwaggerDocument,
  useSelectableNotionPages,
  useSelectableSwaggerDocuments,
  type Project,
  type ProjectMember,
} from '../api/projects';
import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../api/users';

export function Projects() {
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddNotionModal, setShowAddNotionModal] = useState(false);
  const [showAddSwaggerModal, setShowAddSwaggerModal] = useState(false);

  const { data: projectDetail } = useProject(selectedProjectId);
  const { data: members } = useProjectMembers(selectedProjectId);
  const { user } = useAuth();
  const { data: users } = useUsers();
  const { data: selectableNotionPages } = useSelectableNotionPages();
  const { data: selectableSwaggerDocuments } = useSelectableSwaggerDocuments();

  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const addMemberMutation = useAddProjectMember();
  const updateMemberRoleMutation = useUpdateProjectMemberRole();
  const removeMemberMutation = useRemoveProjectMember();
  const addNotionPagesMutation = useAddProjectNotionPages();
  const removeNotionPageMutation = useRemoveProjectNotionPage();
  const addSwaggerDocumentsMutation = useAddProjectSwaggerDocuments();
  const removeSwaggerDocumentMutation = useRemoveProjectSwaggerDocument();

  const [selectedNotionPageIds, setSelectedNotionPageIds] = useState<Set<string>>(new Set());
  const [selectedSwaggerDocumentIds, setSelectedSwaggerDocumentIds] = useState<Set<string>>(new Set());

  // 현재 사용자가 프로젝트 관리자인지 확인
  const currentUserMember = members?.find((m) => m.userId === user?.id);
  const isProjectManager = currentUserMember?.role === 'project_manager';
  const isMember = currentUserMember !== undefined;

  const handleUpdateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    try {
      await updateMutation.mutateAsync({
        projectId: selectedProjectId,
        data: {
          name,
          description: description || undefined,
        },
      });
      alert('프로젝트가 수정되었습니다.');
    } catch (error) {
      console.error('프로젝트 수정 실패:', error);
      alert('프로젝트 수정에 실패했습니다.');
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까? 관련된 모든 데이터가 삭제됩니다.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(selectedProjectId);
      setSelectedProjectId(null);
      alert('프로젝트가 삭제되었습니다.');
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    const formData = new FormData(e.currentTarget);
    const userId = formData.get('userId') as string;
    const role = formData.get('role') as 'member' | 'project_manager';

    try {
      await addMemberMutation.mutateAsync({
        projectId: selectedProjectId,
        data: { userId, role },
      });
      setShowAddMemberModal(false);
      alert('멤버가 추가되었습니다.');
    } catch (error) {
      console.error('멤버 추가 실패:', error);
      alert('멤버 추가에 실패했습니다.');
    }
  };

  const handleUpdateMemberRole = async (userId: string, role: 'member' | 'project_manager') => {
    if (!selectedProjectId) return;

    try {
      await updateMemberRoleMutation.mutateAsync({
        projectId: selectedProjectId,
        userId,
        data: { role },
      });
      alert('멤버 역할이 변경되었습니다.');
    } catch (error) {
      console.error('멤버 역할 변경 실패:', error);
      alert('멤버 역할 변경에 실패했습니다.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedProjectId) return;
    if (!confirm('이 멤버를 프로젝트에서 제거하시겠습니까?')) {
      return;
    }

    try {
      await removeMemberMutation.mutateAsync({
        projectId: selectedProjectId,
        userId,
      });
      alert('멤버가 제거되었습니다.');
    } catch (error) {
      console.error('멤버 제거 실패:', error);
      alert('멤버 제거에 실패했습니다.');
    }
  };

  const handleAddNotionPages = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    const notionPageIds = Array.from(selectedNotionPageIds);

    if (notionPageIds.length === 0) {
      alert('최소 하나의 페이지를 선택해주세요.');
      return;
    }

    try {
      await addNotionPagesMutation.mutateAsync({
        projectId: selectedProjectId,
        data: { notionPageIds },
      });
      setShowAddNotionModal(false);
      setSelectedNotionPageIds(new Set());
      alert('Notion 페이지가 추가되었습니다.');
    } catch (error) {
      console.error('Notion 페이지 추가 실패:', error);
      alert('Notion 페이지 추가에 실패했습니다.');
    }
  };

  const handleRemoveNotionPage = async (notionPageId: string) => {
    if (!selectedProjectId) return;
    if (!confirm('이 Notion 페이지를 프로젝트에서 제거하시겠습니까?')) {
      return;
    }

    try {
      await removeNotionPageMutation.mutateAsync({
        projectId: selectedProjectId,
        notionPageId,
      });
      alert('Notion 페이지가 제거되었습니다.');
    } catch (error) {
      console.error('Notion 페이지 제거 실패:', error);
      alert('Notion 페이지 제거에 실패했습니다.');
    }
  };

  const handleAddSwaggerDocuments = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    const swaggerDocumentIds = Array.from(selectedSwaggerDocumentIds);

    if (swaggerDocumentIds.length === 0) {
      alert('최소 하나의 문서를 선택해주세요.');
      return;
    }

    try {
      await addSwaggerDocumentsMutation.mutateAsync({
        projectId: selectedProjectId,
        data: { swaggerDocumentIds },
      });
      setShowAddSwaggerModal(false);
      setSelectedSwaggerDocumentIds(new Set());
      alert('Swagger 문서가 추가되었습니다.');
    } catch (error) {
      console.error('Swagger 문서 추가 실패:', error);
      alert('Swagger 문서 추가에 실패했습니다.');
    }
  };

  const handleRemoveSwaggerDocument = async (swaggerDocumentId: string) => {
    if (!selectedProjectId) return;
    if (!confirm('이 Swagger 문서를 프로젝트에서 제거하시겠습니까?')) {
      return;
    }

    try {
      await removeSwaggerDocumentMutation.mutateAsync({
        projectId: selectedProjectId,
        swaggerDocumentId,
      });
      alert('Swagger 문서가 제거되었습니다.');
    } catch (error) {
      console.error('Swagger 문서 제거 실패:', error);
      alert('Swagger 문서 제거에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-8">
      {/* 프로젝트 목록 */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">내 프로젝트</h2>

        {isLoadingProjects ? (
          <div className="text-slate-500 dark:text-slate-400">로딩 중...</div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-slate-500 dark:text-slate-400">참여한 프로젝트가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedProjectId === project.id
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-500 shadow-sm'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 shadow-sm'
                }`}
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</div>
                {project.description && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{project.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 프로젝트 상세 */}
      {selectedProjectId && projectDetail && isMember && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">프로젝트 상세</h2>
            {isProjectManager && (
              <button
                onClick={handleDeleteProject}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                프로젝트 삭제
              </button>
            )}
          </div>

          {/* 프로젝트 정보 수정 (프로젝트 관리자만) */}
          {isProjectManager && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">프로젝트 정보 수정</h3>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">이름</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={projectDetail.name}
                    required
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">설명</label>
                  <textarea
                    name="description"
                    defaultValue={projectDetail.description || ''}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  수정
                </button>
              </form>
            </div>
          )}

          {/* 멤버 관리 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">멤버</h3>
              {isProjectManager && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  + 멤버 추가
                </button>
              )}
            </div>
            {members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                  >
                    <div>
                      <div className="text-slate-900 dark:text-white font-medium">
                        {member.user?.email || member.userId}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {member.role === 'project_manager' ? '프로젝트 관리자' : '멤버'}
                      </div>
                    </div>
                    {isProjectManager && (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleUpdateMemberRole(
                              member.userId,
                              e.target.value as 'member' | 'project_manager'
                            )
                          }
                          className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-500"
                        >
                          <option value="member">멤버</option>
                          <option value="project_manager">프로젝트 관리자</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          제거
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400">멤버가 없습니다.</div>
            )}
          </div>

          {/* Notion 페이지 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Notion 페이지</h3>
              {isProjectManager && (
                <button
                  onClick={() => setShowAddNotionModal(true)}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  + 페이지 추가
                </button>
              )}
            </div>
            {projectDetail.notionPages && projectDetail.notionPages.length > 0 ? (
              <div className="space-y-2">
                {projectDetail.notionPages.map((page: any) => {
                  const notionPage = page.notionPage || page;
                  const pageTitle = notionPage.title || '제목 없음';
                  const pageId = notionPage.notionPageId || page.notionPageId || page.id;
                  return (
                    <div
                      key={page.id}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                    >
                      <div>
                        <div className="text-slate-900 dark:text-white font-medium">{pageTitle}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">{pageId}</div>
                      </div>
                      {isProjectManager && (
                        <button
                          onClick={() => handleRemoveNotionPage(page.notionPageId || page.id)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          제거
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400">Notion 페이지가 없습니다.</div>
            )}
          </div>

          {/* Swagger 문서 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Swagger 문서</h3>
              {isProjectManager && (
                <button
                  onClick={() => setShowAddSwaggerModal(true)}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  + 문서 추가
                </button>
              )}
            </div>
            {projectDetail.swaggerDocuments && projectDetail.swaggerDocuments.length > 0 ? (
              <div className="space-y-2">
                {projectDetail.swaggerDocuments.map((doc: any) => {
                  const swaggerDoc = doc.swaggerDocument || doc;
                  const docKey = swaggerDoc.key || '이름 없음';
                  const docTitle = swaggerDoc.title;
                  const docUrl = swaggerDoc.swaggerUrl;
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                    >
                      <div>
                        <div className="text-slate-900 dark:text-white font-medium">{docKey}</div>
                        {docTitle && docTitle !== docKey && (
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{docTitle}</div>
                        )}
                        {docUrl && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate max-w-md">{docUrl}</div>
                        )}
                      </div>
                      {isProjectManager && (
                        <button
                          onClick={() => handleRemoveSwaggerDocument(doc.swaggerDocumentId || doc.id)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          제거
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400">Swagger 문서가 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* 멤버 추가 모달 */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">멤버 추가</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">사용자 *</label>
                <select
                  name="userId"
                  required
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-500"
                >
                  <option value="">사용자를 선택하세요</option>
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email}
                    </option>
                  ))}
                </select>
                {!users || users.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">사용자 목록을 불러올 수 없습니다.</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">역할 *</label>
                <select
                  name="role"
                  required
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-500"
                >
                  <option value="member">멤버</option>
                  <option value="project_manager">프로젝트 관리자</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notion 페이지 추가 모달 */}
      {showAddNotionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Notion 페이지 추가</h3>
            <form onSubmit={handleAddNotionPages} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">페이지 선택 *</label>
                <div className="max-h-60 overflow-y-auto bg-slate-700 rounded-lg p-3 space-y-2">
                  {selectableNotionPages && selectableNotionPages.length > 0 ? (
                    selectableNotionPages.map((page) => (
                      <label
                        key={page.id}
                        className="flex items-center gap-2 p-2 hover:bg-slate-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedNotionPageIds.has(page.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedNotionPageIds);
                            if (e.target.checked) {
                              newSelected.add(page.id);
                            } else {
                              newSelected.delete(page.id);
                            }
                            setSelectedNotionPageIds(newSelected);
                          }}
                          className="w-4 h-4 text-blue-600 bg-slate-600 border-slate-500 rounded focus:ring-blue-500"
                        />
                        <span className="text-white text-sm flex-1">
                          {page.title || page.pageId || page.id}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="text-slate-400 text-sm text-center py-4">
                      추가 가능한 페이지가 없습니다.
                    </div>
                  )}
                </div>
                {selectedNotionPageIds.size > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedNotionPageIds.size}개의 페이지가 선택되었습니다.
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddNotionModal(false);
                    setSelectedNotionPageIds(new Set());
                  }}
                  className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={addNotionPagesMutation.isPending || selectedNotionPageIds.size === 0}
                  className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Swagger 문서 추가 모달 */}
      {showAddSwaggerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Swagger 문서 추가</h3>
            <form onSubmit={handleAddSwaggerDocuments} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">문서 선택 *</label>
                <div className="max-h-60 overflow-y-auto bg-slate-700 rounded-lg p-3 space-y-2">
                  {selectableSwaggerDocuments && selectableSwaggerDocuments.length > 0 ? (
                    selectableSwaggerDocuments.map((doc) => (
                      <label
                        key={doc.id}
                        className="flex items-center gap-2 p-2 hover:bg-slate-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSwaggerDocumentIds.has(doc.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedSwaggerDocumentIds);
                            if (e.target.checked) {
                              newSelected.add(doc.id);
                            } else {
                              newSelected.delete(doc.id);
                            }
                            setSelectedSwaggerDocumentIds(newSelected);
                          }}
                          className="w-4 h-4 text-blue-600 bg-slate-600 border-slate-500 rounded focus:ring-blue-500"
                        />
                        <div className="text-white text-sm flex-1">
                          <div className="font-medium">{doc.key}</div>
                          {doc.swaggerUrl && (
                            <div className="text-xs text-slate-400">{doc.swaggerUrl}</div>
                          )}
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-slate-400 text-sm text-center py-4">
                      추가 가능한 Swagger 문서가 없습니다.
                    </div>
                  )}
                </div>
                {selectedSwaggerDocumentIds.size > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedSwaggerDocumentIds.size}개의 문서가 선택되었습니다.
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSwaggerModal(false);
                    setSelectedSwaggerDocumentIds(new Set());
                  }}
                  className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={addSwaggerDocumentsMutation.isPending || selectedSwaggerDocumentIds.size === 0}
                  className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

