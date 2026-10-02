import { User } from './user';

// contracts/modules/auth.md — POST /v1/auth/login
export type LoginDto = { email: string; password: string };

// data de POST /auth/login y GET /auth/me
export type AuthPayload = {
    user: User;
    company: { id: string; name: string };
};
