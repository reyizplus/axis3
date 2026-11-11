export type AuthResult<T = void> = {
  success: true;
  message?: string;
  data?: T;
  redirectTo?: string;
} | {
  success: false;
  error: string;
  code?: string;
};

export type TwoFactorMethod = 'totp' | 'email' | 'recovery';

export interface TwoFactorSession {
  userId: string;
  email: string;
  method: TwoFactorMethod;
  expiresAt: Date;
  verified: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  isCorporate: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  avatar?: string;
}

export interface AuthSession {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export type AuthEventType =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE'
  | 'LOGOUT' | 'REGISTER_SUCCESS'
  | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_CHANGE' | 'EMAIL_VERIFY'
  | 'TWO_FACTOR_ENABLE' | 'TWO_FACTOR_DISABLE'
  | 'TWO_FACTOR_VERIFY' | 'TWO_FACTOR_FAILURE'
  | 'SESSION_REFRESH' | 'ACCOUNT_SUSPENDED';

export interface AuthEvent {
  id: string;
  userId: string | null;
  email: string | null;
  eventType: AuthEventType;
  ipAddress: string | null;
  userAgent: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
