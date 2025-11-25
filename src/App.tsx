import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Chat } from './components/Chat';
import { Admin } from './components/Admin';
import { ConversationSidebar } from './components/ConversationSidebar';

function ChatLayout() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <>
      <div className="fixed left-0 top-0 w-64 h-screen z-20">
        <ConversationSidebar
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>
      <div className="ml-64">
        <Chat 
          conversationId={selectedConversationId} 
          onConversationCreated={setSelectedConversationId}
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

