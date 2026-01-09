// En @core/models/api-response.ts
export interface SuccessResponse<T = any> {
    entityName: string;
    statusCode: number;
    message: string;
    data?: T;
}

export interface ErrorResponse {
    entityName: string;
    statusCode: number;
    message: string;
    error?: string;
    errors?: Record<string, string[]>; // Para validaciones de campos
}

// Tipo unificado para respuestas HTTP
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Helper para verificar tipo
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
    return response.statusCode >= 200 && response.statusCode < 300;
}

export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
    return response.statusCode >= 400;
}