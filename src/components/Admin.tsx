import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { defaultApi, ragApi, swaggerApi, axiosInstance } from '../api/client';
import { UpdateUserDtoRoleEnum, type UpdateUserDto, type UpdatePageDto, type UpdatePagesDto, type UploadSwaggerDto } from '../api/generated/models';

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

type TabType = 'users' | 'notion' | 'swagger';

interface SwaggerDocument {
  id: string;
  key: string;
  swaggerUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  apiCount?: number;
  indexingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  [key: string]: any;
}

interface SwaggerUploadResponse {
  documentId: string;
  key: string;
  status: string;
}

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

  // Swagger 관리 상태
  const [swaggerDocuments, setSwaggerDocuments] = useState<SwaggerDocument[]>([]);
  const [swaggerLoading, setSwaggerLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadSwaggerDto>({
    key: '',
    swaggerUrl: '',
  });
  const [fileUploadKey, setFileUploadKey] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const [pollingKey, setPollingKey] = useState<string | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'notion') {
      fetchPages();
    } else if (activeTab === 'swagger') {
      fetchSwaggerDocuments();
    }
  }, [activeTab]);

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => {
      setPollingKey(null);
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

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

  // Swagger 관리 함수들
  const fetchSwaggerDocuments = async () => {
    try {
      setSwaggerLoading(true);
      setError(null);
      const response = await swaggerApi.getSwaggerDocuments();
      
      const data = (response.data as any);
      let documentList: SwaggerDocument[] = [];
      
      if (data && data.success && Array.isArray(data.documents)) {
        documentList = data.documents;
      } else if (Array.isArray(data)) {
        documentList = data;
      } else if (data && Array.isArray(data.data)) {
        documentList = data.data;
      }
      
      setSwaggerDocuments(documentList);
    } catch (err: any) {
      console.error('Swagger 문서 목록 가져오기 실패:', err);
      setError(err.response?.data?.message || 'Swagger 문서 목록을 가져오는데 실패했습니다.');
    } finally {
      setSwaggerLoading(false);
    }
  };

  const handleUploadSwagger = async () => {
    if (!uploadForm.key || !uploadForm.swaggerUrl) {
      setError('키와 Swagger URL을 모두 입력해주세요.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await swaggerApi.uploadSwaggerDocument({
        uploadSwaggerDto: uploadForm,
      });
      
      setUploadForm({ key: '', swaggerUrl: '' });
      await fetchSwaggerDocuments();
      
      setUpdateResult({
        show: true,
        success: true,
        message: 'Swagger 문서가 성공적으로 업로드되었습니다.',
      });
    } catch (err: any) {
      console.error('Swagger 문서 업로드 실패:', err);
      const errorMessage = err.response?.data?.message || 'Swagger 문서 업로드에 실패했습니다.';
      setError(errorMessage);
      
      setUpdateResult({
        show: true,
        success: false,
        message: errorMessage,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 확장자 검증
      if (!file.name.toLowerCase().endsWith('.json')) {
        setError('JSON 파일만 업로드 가능합니다.');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  // 키로 Swagger 문서 상태 조회
  const getSwaggerDocumentByKey = async (key: string): Promise<SwaggerDocument | null> => {
    try {
      const response = await axiosInstance.get(`/swagger/documents/key/${encodeURIComponent(key)}`);
      return response.data as SwaggerDocument;
    } catch (err: any) {
      console.error('문서 상태 조회 실패:', err);
      return null;
    }
  };

  // 폴링으로 처리 상태 확인
  const pollSwaggerStatus = (key: string, maxAttempts = 60, interval = 2000): void => {
    let attempts = 0;
    
    const poll = async (): Promise<void> => {
      // 폴링이 취소되었는지 확인
      if (pollingKey !== key) {
        return;
      }
      
      attempts++;
      const doc = await getSwaggerDocumentByKey(key);
      
      // 폴링이 취소되었는지 다시 확인
      if (pollingKey !== key) {
        return;
      }
      
      if (!doc) {
        if (attempts >= maxAttempts) {
          setError('문서 상태를 확인할 수 없습니다. 목록을 새로고침해주세요.');
          setPollingKey(null);
          fetchSwaggerDocuments();
          return;
        }
        pollingTimeoutRef.current = setTimeout(poll, interval);
        return;
      }

      const status = doc.indexingStatus || 'pending';
      
      // 상태 업데이트를 위해 목록 새로고침
      await fetchSwaggerDocuments();

      // 폴링이 취소되었는지 다시 확인
      if (pollingKey !== key) {
        return;
      }

      if (status === 'completed') {
        setPollingKey(null);
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
          pollingTimeoutRef.current = null;
        }
        setUpdateResult({
          show: true,
          success: true,
          message: `Swagger 문서 처리가 완료되었습니다. (API ${doc.apiCount || 0}개)`,
        });
      } else if (status === 'failed') {
        setPollingKey(null);
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
          pollingTimeoutRef.current = null;
        }
        const errorMsg = doc.errorMessage || '처리 중 오류가 발생했습니다.';
        setError(errorMsg);
        setUpdateResult({
          show: true,
          success: false,
          message: `Swagger 문서 처리 실패: ${errorMsg}`,
        });
      } else if (status === 'pending' || status === 'processing') {
        if (attempts >= maxAttempts) {
          setPollingKey(null);
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
          }
          setError('처리 시간이 초과되었습니다. 목록에서 상태를 확인해주세요.');
          fetchSwaggerDocuments();
        } else {
          pollingTimeoutRef.current = setTimeout(poll, interval);
        }
      }
    };

    poll();
  };

  const handleUploadSwaggerFile = async () => {
    if (!fileUploadKey || !selectedFile) {
      setError('키와 JSON 파일을 모두 선택해주세요.');
      return;
    }

    try {
      setUploadingFile(true);
      setError(null);
      const response = await swaggerApi.uploadSwaggerFile({
        key: fileUploadKey,
        file: selectedFile,
      });
      
      // 응답에서 documentId와 key 추출
      const responseData = (response.data as any) as SwaggerUploadResponse;
      const uploadedKey = responseData?.key || fileUploadKey;
      
      // 폼 초기화
      const savedKey = fileUploadKey;
      setFileUploadKey('');
      setSelectedFile(null);
      // 파일 input 초기화
      const fileInput = document.getElementById('swagger-file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // 즉시 목록 새로고침
      await fetchSwaggerDocuments();
      
      // 폴링 시작
      setPollingKey(savedKey);
      setUpdateResult({
        show: true,
        success: true,
        message: 'Swagger JSON 파일이 업로드되었습니다. 백그라운드에서 처리 중입니다...',
      });
      
      // 폴링 시작
      pollSwaggerStatus(savedKey);
    } catch (err: any) {
      console.error('Swagger 파일 업로드 실패:', err);
      const errorMessage = err.response?.data?.message || 'Swagger 파일 업로드에 실패했습니다.';
      setError(errorMessage);
      
      setUpdateResult({
        show: true,
        success: false,
        message: errorMessage,
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteSwagger = async (id: string) => {
    if (!confirm('이 Swagger 문서를 삭제하시겠습니까? 관련된 모든 벡터 데이터가 삭제됩니다.')) {
      return;
    }

    try {
      setDeleting(id);
      setError(null);
      await swaggerApi.deleteSwaggerDocument({ id });
      await fetchSwaggerDocuments();
      
      setUpdateResult({
        show: true,
        success: true,
        message: 'Swagger 문서가 성공적으로 삭제되었습니다.',
      });
    } catch (err: any) {
      console.error('Swagger 문서 삭제 실패:', err);
      const errorMessage = err.response?.data?.message || 'Swagger 문서 삭제에 실패했습니다.';
      setError(errorMessage);
      
      setUpdateResult({
        show: true,
        success: false,
        message: errorMessage,
      });
    } finally {
      setDeleting(null);
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
            <button
              onClick={() => setActiveTab('swagger')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'swagger'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Swagger 관리
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

        {/* Swagger 관리 탭 */}
        {activeTab === 'swagger' && (
          <div className="space-y-6">
            {/* 업로드 액션 영역 - 통합 */}
            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Swagger 문서 업로드
                  </h2>
                  <button
                    onClick={fetchSwaggerDocuments}
                    disabled={swaggerLoading || uploading || uploadingFile}
                    className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {swaggerLoading ? '로딩 중...' : '새로고침'}
                  </button>
                </div>

                {/* 업로드 방식 탭 */}
                <div className="flex gap-2 border-b border-slate-700">
                  <button
                    onClick={() => setUploadMethod('url')}
                    className={`px-4 py-2 font-medium transition-colors relative ${
                      uploadMethod === 'url'
                        ? 'text-blue-400'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      URL로 업로드
                    </span>
                    {uploadMethod === 'url' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setUploadMethod('file')}
                    className={`px-4 py-2 font-medium transition-colors relative ${
                      uploadMethod === 'file'
                        ? 'text-blue-400'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      파일로 업로드
                    </span>
                    {uploadMethod === 'file' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* URL 업로드 폼 */}
                {uploadMethod === 'url' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        문서 키 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={uploadForm.key}
                        onChange={(e) =>
                          setUploadForm({ ...uploadForm, key: e.target.value })
                        }
                        placeholder="예: my_api_docs"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        영어, 숫자, 소문자, 언더스코어만 허용. 같은 키가 이미 존재하면 기존 데이터를 삭제하고 재업로드됩니다.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Swagger JSON URL <span className="text-red-400">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={uploadForm.swaggerUrl}
                          onChange={(e) =>
                            setUploadForm({ ...uploadForm, swaggerUrl: e.target.value })
                          }
                          placeholder="예: http://localhost:3001/api-json"
                          className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleUploadSwagger}
                          disabled={uploading || !uploadForm.key || !uploadForm.swaggerUrl}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                        >
                          {uploading ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              업로드 중...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              업로드
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Swagger JSON 형식의 OpenAPI 스펙 URL을 입력하세요.
                      </p>
                    </div>
                  </div>
                )}

                {/* 파일 업로드 폼 */}
                {uploadMethod === 'file' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        문서 키 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={fileUploadKey}
                        onChange={(e) => setFileUploadKey(e.target.value)}
                        placeholder="예: my_api_docs"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        영어, 숫자, 소문자, 언더스코어만 허용. 같은 키가 이미 존재하면 기존 데이터를 삭제하고 재업로드됩니다.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Swagger JSON 파일 <span className="text-red-400">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="swagger-file-input"
                          type="file"
                          accept=".json"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <label
                          htmlFor="swagger-file-input"
                          className="flex-1 px-4 py-2 bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-600 hover:border-blue-500 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="font-medium">
                            {selectedFile ? selectedFile.name : 'JSON 파일 선택'}
                          </span>
                        </label>
                        <button
                          onClick={handleUploadSwaggerFile}
                          disabled={uploadingFile || !fileUploadKey || !selectedFile}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                        >
                          {uploadingFile ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              업로드 중...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              업로드
                            </>
                          )}
                        </button>
                      </div>
                      {selectedFile && (
                        <div className="mt-2 px-3 py-2 bg-blue-900/30 border border-blue-700/50 rounded-lg flex items-center gap-2 text-sm text-blue-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          파일이 선택되었습니다: {selectedFile.name}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Swagger JSON 형식의 파일만 업로드 가능합니다. (확장자: .json)
                      </p>
                    </div>
                  </div>
                )}

                {/* 폴링 중 표시 */}
                {pollingKey && (
                  <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                    <p className="text-xs text-yellow-300 flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>문서 키 &quot;{pollingKey}&quot; 처리 중... 상태를 확인하고 있습니다.</span>
                    </p>
                  </div>
                )}

                {/* 공통 안내 메시지 */}
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                  <p className="text-xs text-blue-300 flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Swagger 문서를 업로드하면 API 정보가 벡터 DB에 저장되어 RAG 검색에 활용됩니다. 파일 업로드는 백그라운드에서 처리됩니다.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Swagger 문서 목록 */}
            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Swagger 문서 목록
                  </h2>
                  {swaggerDocuments.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm font-medium rounded-full">
                        총 {swaggerDocuments.length}개
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {swaggerLoading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">문서 목록을 불러오는 중...</p>
                </div>
              ) : swaggerDocuments.length === 0 ? (
                <div className="p-12 text-center">
                  <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-400 text-lg mb-2">업로드된 Swagger 문서가 없습니다</p>
                  <p className="text-sm text-slate-500">위의 폼을 사용하여 Swagger 문서를 업로드하세요.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {swaggerDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-6 hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <div className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm font-semibold rounded-lg">
                              {doc.key}
                            </div>
                            {doc.indexingStatus && (
                              <span className={`px-2 py-1 text-xs rounded font-medium ${
                                doc.indexingStatus === 'completed'
                                  ? 'bg-green-600/20 text-green-400'
                                  : doc.indexingStatus === 'failed'
                                  ? 'bg-red-600/20 text-red-400'
                                  : doc.indexingStatus === 'processing'
                                  ? 'bg-yellow-600/20 text-yellow-400'
                                  : 'bg-slate-700 text-slate-400'
                              }`}>
                                {doc.indexingStatus === 'completed' && '✓ 완료'}
                                {doc.indexingStatus === 'failed' && '✗ 실패'}
                                {doc.indexingStatus === 'processing' && (
                                  <>
                                    <svg className="inline-block w-3 h-3 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    처리 중
                                  </>
                                )}
                                {doc.indexingStatus === 'pending' && '대기 중'}
                              </span>
                            )}
                            {doc.apiCount !== undefined && doc.indexingStatus === 'completed' && (
                              <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                                API {doc.apiCount}개
                              </span>
                            )}
                          </div>
                          {doc.indexingStatus === 'failed' && doc.errorMessage && (
                            <div className="mt-2 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded-lg">
                              <p className="text-xs text-red-300">{doc.errorMessage}</p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              {doc.swaggerUrl ? (
                                <a
                                  href={doc.swaggerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 hover:underline transition-colors break-all text-sm"
                                >
                                  {doc.swaggerUrl}
                                </a>
                              ) : (
                                <span className="text-slate-500 text-sm italic">
                                  파일로 업로드됨 (URL 없음)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span className="font-mono text-slate-400">{doc.id}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{formatToKST(doc.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleDeleteSwagger(doc.id)}
                            disabled={deleting === doc.id}
                            className="px-4 py-2 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 disabled:bg-slate-700 disabled:text-slate-600 rounded-lg transition-colors flex items-center gap-2"
                            title="이 Swagger 문서를 삭제합니다. 관련된 모든 벡터 데이터가 삭제됩니다."
                          >
                            {deleting === doc.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                삭제 중...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                삭제
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
