import { User } from './user';

// contracts/modules/auth.md — POST /v1/auth/login
export type LoginDto = { email: string; password: string };

// data de POST /auth/login y GET /auth/me
export type AuthPayload = {
    user: User;
    company: { id: string; name: string };
};

// Segundo factor (D94). Con el factor obligatorio, el login no abre sesión: devuelve este paso y deja la cookie `mnk_mfa`.
export type MfaStep = {
    next_step: 'mfa_verify' | 'mfa_setup';
    expires_at: string;
};

export type MfaSetupStart = {
    secret: string;
    otpauth_uri: string;
    issuer: string;
    account: string;
};

// `recovery_codes` solo viene al activar el factor (se muestran una sola vez); `recovery_codes_left`, al entrar con un código de recuperación.
export type AuthPayloadWithRecovery = AuthPayload & {
    recovery_codes?: string[];
    recovery_codes_left?: number | null;
};

export type LoginOutcome = { kind: 'session'; user: User } | { kind: 'mfa'; step: MfaStep };
