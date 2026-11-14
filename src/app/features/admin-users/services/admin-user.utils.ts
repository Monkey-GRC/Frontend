import { ADMIN_ERROR_CODES } from '@features/admin-users/models/admin-user.model';

const DAY_MS = 86_400_000;

// Días enteros que faltan para que se borre la cuenta (0 si es hoy o ya venció); null si no hay fecha.
export function daysUntilPurge(purgeAt: string | null | undefined, now: number = Date.now()): number | null {
  if (!purgeAt) return null;
  const time = new Date(purgeAt).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.ceil((time - now) / DAY_MS));
}

// La clave i18n del texto que explica un error del contrato; null si el código no es uno de los conocidos (se usa el mensaje del servidor).
export function adminErrorKey(code: string | null | undefined): string | null {
  return code && (ADMIN_ERROR_CODES as readonly string[]).includes(code) ? `ADMIN_USERS.ERRORS.${code}` : null;
}
