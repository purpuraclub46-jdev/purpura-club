import { Role } from '@prisma/client';

export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  type: TokenType;
}

export interface JwtSignedPayload extends JwtPayload {
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
  jti?: string;
}
