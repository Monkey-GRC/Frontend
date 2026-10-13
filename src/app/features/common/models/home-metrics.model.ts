import { AccessKeyStatus, Company } from '@features/companies/models/company.model';

// Las métricas del home de Monkey Admin salen TODAS de `GET /v1/companies` (no hay endpoint de métricas): se calculan aquí sobre la lista.
// Es una función pura, sin textos ni HTTP, para poder probarla sola.

export type KeyBucket = AccessKeyStatus | 'none';

// Por qué una empresa pide atención, de más a menos urgente.
export type AttentionReason = 'key_expired' | 'onboarding_pending' | 'suspended';

export interface AttentionItem {
    company: Company;
    reason: AttentionReason;
}

export interface FrameworkCount {
    code: string;
    name: string;
    count: number;
}

export interface HomeMetrics {
    total: number;
    active: number;
    suspended: number;
    onboardingDone: number;
    onboardingPending: number;
    createdLast30Days: number;
    keys: Record<KeyBucket, number>;
    frameworks: FrameworkCount[];
    isolation: { dedicated: number; shared: number };
    recent: Company[];
    attention: AttentionItem[];
    // Cuántas hay en total que piden atención (la lista `attention` se corta).
    attentionTotal: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIORITY: Record<AttentionReason, number> = { key_expired: 0, onboarding_pending: 1, suspended: 2 };

function attentionReason(company: Company): AttentionReason | null {
    if (company.status === 'suspended') return 'suspended';
    if (company.access_key_status === 'expired') return 'key_expired';
    // Activó su cuenta (usó la clave) pero todavía no terminó de contar de su empresa.
    if (company.access_key_status === 'used' && !company.onboarding_completed) return 'onboarding_pending';
    return null;
}

export function computeHomeMetrics(companies: Company[], now: Date = new Date(), limits = { recent: 5, attention: 8 }): HomeMetrics {
    const keys: Record<KeyBucket, number> = { pending: 0, used: 0, expired: 0, revoked: 0, none: 0 };
    const frameworks = new Map<string, FrameworkCount>();
    const isolation = { dedicated: 0, shared: 0 };
    let active = 0;
    let onboardingDone = 0;
    let createdLast30Days = 0;
    const attention: AttentionItem[] = [];

    for (const company of companies) {
        if (company.status === 'active') active++;
        if (company.onboarding_completed) onboardingDone++;
        if (now.getTime() - new Date(company.created_at).getTime() <= 30 * DAY_MS) createdLast30Days++;
        keys[company.access_key_status ?? 'none']++;
        isolation[company.isolation_strategy === 'dedicated' ? 'dedicated' : 'shared']++;
        for (const framework of company.frameworks) {
            const entry = frameworks.get(framework.code) ?? { code: framework.code, name: framework.name, count: 0 };
            entry.count++;
            frameworks.set(framework.code, entry);
        }
        const reason = attentionReason(company);
        if (reason) attention.push({ company, reason });
    }

    attention.sort((a, b) => PRIORITY[a.reason] - PRIORITY[b.reason] || a.company.name.localeCompare(b.company.name));
    const recent = [...companies].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limits.recent);

    return {
        total: companies.length,
        active,
        suspended: companies.length - active,
        onboardingDone,
        onboardingPending: companies.length - onboardingDone,
        createdLast30Days,
        keys,
        frameworks: [...frameworks.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
        isolation,
        recent,
        attention: attention.slice(0, limits.attention),
        attentionTotal: attention.length,
    };
}
