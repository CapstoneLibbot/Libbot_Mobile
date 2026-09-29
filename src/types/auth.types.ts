export type Role = 'READER' | 'LIBRARIAN' | 'ADMIN';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: SessionUser;
}
