import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Chat } from './components/Chat';
import { Admin } from './components/Admin';
import { Management } from './components/Management';
import { ConversationSidebar } from './components/ConversationSidebar';

const STORAGE_KEYS = {
  PROJECT_ID: 'selectedProjectId',
} as const;

function ChatLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationIdFromUrl);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    // 초기값을 로컬 스토리지에서 가져오기
    return localStorage.getItem(STORAGE_KEYS.PROJECT_ID);
  });

  // URL의 conversation 파라미터가 변경되면 상태 업데이트
  useEffect(() => {
    setSelectedConversationId(conversationIdFromUrl);
  }, [conversationIdFromUrl]);

  const handleSelectConversation = (id: string | null) => {
    setSelectedConversationId(id);
    const params = new URLSearchParams(searchParams);
    if (id) {
      params.set('conversation', id);
    } else {
      params.delete('conversation');
    }
    setSearchParams(params);
  };

  const handleSelectProject = (id: string | null) => {
    setSelectedProjectId(id);
    // 로컬 스토리지에 저장
    if (id) {
      localStorage.setItem(STORAGE_KEYS.PROJECT_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.PROJECT_ID);
    }
  };

  const handleConversationCreated = (id: string) => {
    setSelectedConversationId(id);
    const params = new URLSearchParams(searchParams);
    params.set('conversation', id);
    setSearchParams(params);
  };

  return (
    <>
      <div className="fixed left-0 top-0 w-64 h-screen z-20">
        <ConversationSidebar
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
        />
      </div>
      <div className="ml-64">
        <Chat 
          conversationId={selectedConversationId} 
          onConversationCreated={handleConversationCreated}
          projectId={selectedProjectId}
        />
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ChatLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route
            path="/management"
            element={
              <ProtectedRoute>
                <Management />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

