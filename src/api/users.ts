import { useQuery } from '@tanstack/react-query';
import { defaultApi } from './client';

export interface User {
  id: string;
  email: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 모든 사용자 목록 조회 (서브 관리자/관리자 전용)
 */
export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await defaultApi.getAllUsers();
      const data = response.data as any;
      
      let userList: User[] = [];
      
      if (Array.isArray(data)) {
        userList = data;
      } else if (data && Array.isArray(data.users)) {
        userList = data.users;
      } else if (data && Array.isArray(data.data)) {
        userList = data.data;
      } else if (data && typeof data === 'object') {
        const values = Object.values(data);
        if (values.length > 0 && Array.isArray(values[0])) {
          userList = values[0] as User[];
        }
      }
      
      return userList;
    },
  });
}


