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

function ChatLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationIdFromUrl);

  // URL의 conversation 파라미터가 변경되면 상태 업데이트
  useEffect(() => {
    setSelectedConversationId(conversationIdFromUrl);
  }, [conversationIdFromUrl]);

  const handleSelectConversation = (id: string | null) => {
    setSelectedConversationId(id);
    if (id) {
      setSearchParams({ conversation: id });
    } else {
      setSearchParams({});
    }
  };

  const handleConversationCreated = (id: string) => {
    setSelectedConversationId(id);
    setSearchParams({ conversation: id });
  };

  return (
    <>
      <div className="fixed left-0 top-0 w-64 h-screen z-20">
        <ConversationSidebar
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>
      <div className="ml-64">
        <Chat 
          conversationId={selectedConversationId} 
          onConversationCreated={handleConversationCreated}
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

