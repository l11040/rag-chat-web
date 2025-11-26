import { useState } from 'react';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useUpdateConversationTitle,
  type Conversation,
} from '../api/conversations';

interface ConversationSidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
}

export function ConversationSidebar({
  selectedConversationId,
  onSelectConversation,
}: ConversationSidebarProps) {
  const { data: conversations, isLoading } = useConversations();
  const createMutation = useCreateConversation();
  const deleteMutation = useDeleteConversation();
  const updateTitleMutation = useUpdateConversationTitle();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleNewConversation = async () => {
    try {
      const result = await createMutation.mutateAsync(undefined);
      onSelectConversation(result.conversation.id);
    } catch (error) {
      console.error('대화 생성 실패:', error);
    }
  };

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    id: string
  ) => {
    e.stopPropagation();
    if (confirm('이 대화를 삭제하시겠습니까?')) {
      try {
        await deleteMutation.mutateAsync(id);
        if (selectedConversationId === id) {
          onSelectConversation(null);
        }
      } catch (error) {
        console.error('대화 삭제 실패:', error);
      }
    }
  };

  const handleStartEdit = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditTitle(conversation.title || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateTitleMutation.mutateAsync({ id, title: editTitle });
      setEditingId(null);
      setEditTitle('');
    } catch (error) {
      console.error('제목 업데이트 실패:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '오늘';
    } else if (days === 1) {
      return '어제';
    } else if (days < 7) {
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.title) {
      return conversation.title;
    }
    return '새 대화';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* 헤더 */}
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={handleNewConversation}
          disabled={createMutation.isPending}
          className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          새 대화
        </button>
      </div>

      {/* 대화 목록 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            로딩 중...
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            대화가 없습니다
            <br />
            새 대화를 시작해보세요
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative mb-1 p-3 rounded-lg cursor-pointer transition ${
                  selectedConversationId === conversation.id
                    ? 'bg-slate-800 text-white'
                    : 'hover:bg-slate-800/50 text-slate-300'
                }`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                {editingId === conversation.id ? (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(conversation.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 bg-slate-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="text-xs text-slate-400 mt-1">
                        {formatDate(conversation.updatedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit(conversation.id);
                        }}
                        className="p-1 text-green-400 hover:text-green-300 hover:bg-slate-700 rounded"
                        title="저장"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded"
                        title="취소"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {getConversationTitle(conversation)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {formatDate(conversation.updatedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => handleStartEdit(e, conversation)}
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                          title="제목 수정"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) =>
                            handleDeleteConversation(e, conversation.id)
                          }
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                          title="삭제"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

