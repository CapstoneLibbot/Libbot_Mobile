import { ReactNode, useEffect } from 'react';
import { secureStorage } from '../../services/storage/secureStorage';
import { useAppStore } from '../store/appStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const setUser = useAppStore((state) => state.setUser);

  useEffect(() => {
    const restoreSession = async () => {
      const session = await secureStorage.get<{ accessToken?: string; user?: { id: string; name: string; email: string; role: 'READER' | 'LIBRARIAN' | 'ADMIN' } }>('session');

      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        });
      }
    };

    void restoreSession();
  }, [setUser]);

  return <>{children}</>;
}

