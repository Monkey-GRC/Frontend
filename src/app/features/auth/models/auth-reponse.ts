export type LoginDto = { identifier: string; password: string };

export type LoginResponse = {
    status: number;
    message: string;
    data: {
        access_token: string;
        access_token_expires_at?: string;
        refresh_token?: string;
        refresh_token_expires_at?: string;
        user?: any;
    };
};