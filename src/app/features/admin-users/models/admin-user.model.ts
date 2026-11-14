// contracts/gestion-usuarios/administradores.md (D117). Nombres de campo del contrato.
export type AdminStatus = 'pending' | 'active' | 'inactive';
export type AdminRole = 'admin_monkey';
export type InvitationDelivery = 'sent' | 'failed';

// Los valores que acepta el filtro `status` de GET /v1/admins (el contrato los fija; no hay catálogo servido para `user_status`).
export const ADMIN_STATUS_FILTERS: readonly AdminStatus[] = ['active', 'pending', 'inactive'];
// D117: hoy solo se invita a `admin_monkey`; otro valor es 422 role.not_allowed.
export const INVITABLE_ROLES: readonly AdminRole[] = ['admin_monkey'];
export type AdminSort = 'created_at' | '-created_at' | 'email' | '-email' | 'purge_at' | '-purge_at';

export interface AdminInviter {
  id: string;
  name: string;
  last_name: string;
  // true = la cuenta ya se purgó: es el sello de auditoría.
  purged?: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  last_name: string;
  role: AdminRole;
  status: AdminStatus;
  is_mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string | null;
  invited_by: AdminInviter | null;
  purge_at: string | null;
}

export interface AdminInvitation {
  delivery_status: InvitationDelivery;
  expires_at: string;
}

export interface InvitedAdmin extends AdminUser {
  invitation: AdminInvitation;
}

// Lo que se escribe en el formulario; el código del segundo factor lo pide después el diálogo reutilizable.
export interface InviteAdminData {
  email: string;
  name: string;
  last_name: string;
  role: AdminRole;
}

export interface InviteAdmin extends InviteAdminData {
  totp_code: string;
}

export interface AdminPage {
  items: AdminUser[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AdminListQuery {
  page: number;
  pageSize: number;
  sort: AdminSort;
  status: AdminStatus | '';
}

// Códigos del contrato que la pantalla explica con su propio texto (ADMIN_USERS.ERRORS.<código>).
export const ADMIN_ERROR_CODES = [
  'CANNOT_DEACTIVATE_SELF',
  'LAST_ADMIN',
  'ADMIN_ALREADY_INACTIVE',
  'ADMIN_NOT_INACTIVE',
  'EMAIL_TAKEN',
  'USER_NOT_ACTIVATED',
  'USER_ALREADY_ACTIVE',
  'MFA_CODE_INVALID',
  'MFA_NOT_ENABLED',
  'ACCOUNT_LOCKED',
  'ACCOUNT_INACTIVE',
  'VALIDATION_FAILED',
  'FORBIDDEN',
  'NOT_FOUND',
] as const;
