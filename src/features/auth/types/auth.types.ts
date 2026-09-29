export interface LoginPayload {
  email: string;
  password: string;
  role: 'READER' | 'LIBRARIAN';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'READER' | 'LIBRARIAN';
  };
}
