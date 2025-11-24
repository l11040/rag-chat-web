import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { defaultApi } from '../api/client';
import type { LoginDto, RegisterDto, RefreshTokenDto } from '../api/generated/models';
import { UpdateUserDtoRoleEnum } from '../api/generated/models';

interface User {
  id: string;
  email: string;
  role?: UpdateUserDtoRoleEnum;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  fetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
} as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveAuthData = (tokens: AuthTokens, userData: User) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    setUser(userData);
  };

  const clearAuthData = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
  };

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        return false;
      }

      const refreshTokenDto: RefreshTokenDto = { refreshToken };
      const response = await defaultApi.refresh({ refreshTokenDto });
      
      // 응답에서 새 토큰 추출 (실제 API 응답 구조에 맞게 수정 필요)
      const data = response.data as any;
      const newAccessToken = data.accessToken || data.access_token;
      const newRefreshToken = data.refreshToken || data.refresh_token || refreshToken;

      if (newAccessToken) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
        if (newRefreshToken && newRefreshToken !== refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      return false;
    }
  }, []);

  // 유저 프로필 정보 가져오기
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await defaultApi.getProfile();
      const userData = response.data as any;
      
      if (userData) {
        const updatedUser: User = {
          id: userData.id || userData.userId || '',
          email: userData.email || '',
          role: userData.role,
        };
        setUser(updatedUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('프로필 정보 가져오기 실패:', error);
      throw error;
    }
  }, []);

  // localStorage에서 토큰 및 유저 정보 로드
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const storedAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (storedUser && storedAccessToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // 토큰이 있으면 최신 유저 정보 가져오기 시도
          try {
            await fetchUserProfile();
          } catch (error) {
            // 토큰이 만료되었을 수 있으므로 리프레시 시도
            if (storedRefreshToken) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                // 리프레시 성공 시 다시 프로필 가져오기
                try {
                  await fetchUserProfile();
                } catch (profileError) {
                  console.error('프로필 정보 가져오기 실패:', profileError);
                }
              } else {
                // 리프레시 실패 시 로그아웃
                clearAuthData();
              }
            } else {
              clearAuthData();
            }
          }
        }
      } catch (error) {
        console.error('인증 데이터 로드 실패:', error);
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, [fetchUserProfile, refreshAccessToken]);

  const login = async (email: string, password: string) => {
    try {
      const loginDto: LoginDto = { email, password };
      const response = await defaultApi.login({ loginDto });
      
      // 응답에서 토큰 및 유저 정보 추출 (실제 API 응답 구조에 맞게 수정 필요)
      const data = response.data as any;
      const accessToken = data.accessToken || data.access_token;
      const refreshToken = data.refreshToken || data.refresh_token;
      const userData: User = data.user || { 
        id: data.userId || '', 
        email,
        role: data.role || data.user?.role,
      };

      if (!accessToken || !refreshToken) {
        throw new Error('토큰을 받지 못했습니다.');
      }

      saveAuthData({ accessToken, refreshToken }, userData);
      
      // 로그인 후 최신 프로필 정보 가져오기
      try {
        await fetchUserProfile();
      } catch (profileError) {
        console.error('프로필 정보 가져오기 실패:', profileError);
        // 프로필 가져오기 실패해도 로그인은 유지
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '로그인에 실패했습니다.';
      throw new Error(errorMessage);
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const registerDto: RegisterDto = { email, password };
      const response = await defaultApi.register({ registerDto });
      
      // 회원가입 후 자동 로그인 (API가 토큰을 반환하는 경우)
      const data = response.data as any;
      if (data.accessToken && data.refreshToken) {
        const accessToken = data.accessToken || data.access_token;
        const refreshToken = data.refreshToken || data.refresh_token;
        const userData: User = data.user || { 
          id: data.userId || '', 
          email,
          role: data.role || data.user?.role,
        };
        saveAuthData({ accessToken, refreshToken }, userData);
        
        // 회원가입 후 최신 프로필 정보 가져오기
        try {
          await fetchUserProfile();
        } catch (profileError) {
          console.error('프로필 정보 가져오기 실패:', profileError);
        }
      } else {
        // 회원가입만 하고 로그인은 별도로 해야 하는 경우
        throw new Error('회원가입은 완료되었지만 자동 로그인에 실패했습니다. 로그인 페이지에서 로그인해주세요.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '회원가입에 실패했습니다.';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      // 서버에 로그아웃 요청 (선택사항)
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (accessToken) {
        try {
          await defaultApi.logout();
        } catch (error) {
          // 로그아웃 API 실패해도 클라이언트에서는 로그아웃 처리
          console.error('로그아웃 API 호출 실패:', error);
        }
      }
    } finally {
      clearAuthData();
    }
  };

  const isAdmin = user?.role === UpdateUserDtoRoleEnum.admin || user?.role === UpdateUserDtoRoleEnum.sub_admin;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin,
        login,
        register,
        logout,
        refreshAccessToken,
        fetchUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

