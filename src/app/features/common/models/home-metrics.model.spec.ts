import { AccessKeyStatus, Company } from '@features/companies/models/company.model';
import { computeHomeMetrics } from './home-metrics.model';

const NOW = new Date('2026-10-13T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

let seq = 0;
const company = (over: Partial<Company> = {}): Company => ({
    id: `c${++seq}`,
    name: `Empresa ${seq}`,
    admin_email: `admin${seq}@x.com`,
    isolation_strategy: 'shared',
    status: 'active',
    frameworks: [{ code: 'soc2', name: 'SOC 2', contracted_at: daysAgo(1) }],
    access_key_status: 'used' as AccessKeyStatus,
    access_key_expires_at: null,
    onboarding_completed: true,
    created_at: daysAgo(100),
    ...over,
});

describe('computeHomeMetrics', () => {
    it('is all zeros for an empty list', () => {
        const m = computeHomeMetrics([], NOW);
        expect(m.total).toBe(0);
        expect(m.recent).toEqual([]);
        expect(m.attention).toEqual([]);
        expect(m.keys).toEqual({ pending: 0, used: 0, expired: 0, revoked: 0, none: 0 });
    });

    it('counts active vs suspended and onboarding done vs pending', () => {
        const m = computeHomeMetrics([company(), company({ status: 'suspended' }), company({ onboarding_completed: false })], NOW);
        expect(m.total).toBe(3);
        expect(m.active).toBe(2);
        expect(m.suspended).toBe(1);
        expect(m.onboardingDone).toBe(2);
        expect(m.onboardingPending).toBe(1);
    });

    it('counts the access keys by state, including companies without a key', () => {
        const m = computeHomeMetrics(
            [
                company({ access_key_status: 'pending' }),
                company({ access_key_status: 'pending' }),
                company({ access_key_status: 'used' }),
                company({ access_key_status: 'expired' }),
                company({ access_key_status: 'revoked' }),
                company({ access_key_status: null }),
            ],
            NOW,
        );
        expect(m.keys).toEqual({ pending: 2, used: 1, expired: 1, revoked: 1, none: 1 });
    });

    it('counts the sign-ups of the last 30 days', () => {
        const m = computeHomeMetrics([company({ created_at: daysAgo(2) }), company({ created_at: daysAgo(30) }), company({ created_at: daysAgo(31) })], NOW);
        expect(m.createdLast30Days).toBe(2);
    });

    it('lists the most recent companies first, up to the limit', () => {
        const list = [1, 5, 3, 9, 2, 7, 4].map((d) => company({ name: `d${d}`, created_at: daysAgo(d) }));
        const m = computeHomeMetrics(list, NOW, { recent: 3, attention: 8 });
        expect(m.recent.map((c) => c.name)).toEqual(['d1', 'd2', 'd3']);
    });

    it('flags what needs attention, most urgent first: expired key, onboarding stuck, suspended', () => {
        const m = computeHomeMetrics(
            [
                company({ name: 'Suspendida', status: 'suspended' }),
                company({ name: 'Sin contar', access_key_status: 'used', onboarding_completed: false }),
                company({ name: 'Vencida', access_key_status: 'expired' }),
                company({ name: 'Todo bien' }),
            ],
            NOW,
        );
        expect(m.attention.map((a) => [a.company.name, a.reason])).toEqual([
            ['Vencida', 'key_expired'],
            ['Sin contar', 'onboarding_pending'],
            ['Suspendida', 'suspended'],
        ]);
    });

    it('does not flag a company that has not used its key yet as stuck in onboarding', () => {
        const m = computeHomeMetrics([company({ access_key_status: 'pending', onboarding_completed: false })], NOW);
        expect(m.attentionTotal).toBe(0);
    });

    it('a suspended company is reported only once, as suspended', () => {
        const m = computeHomeMetrics([company({ status: 'suspended', access_key_status: 'expired' })], NOW);
        expect(m.attention.length).toBe(1);
        expect(m.attention[0].reason).toBe('suspended');
    });

    it('cuts the attention list but still says how many there are', () => {
        const list = Array.from({ length: 12 }, () => company({ access_key_status: 'expired' }));
        const m = computeHomeMetrics(list, NOW, { recent: 5, attention: 8 });
        expect(m.attention.length).toBe(8);
        expect(m.attentionTotal).toBe(12);
    });

    it('counts the contracted frameworks and the isolation', () => {
        const m = computeHomeMetrics(
            [
                company({ isolation_strategy: 'dedicated' }),
                company(),
                company({ frameworks: [] }),
                company({ frameworks: [{ code: 'iso27001', name: 'ISO 27001', contracted_at: daysAgo(1) }, { code: 'soc2', name: 'SOC 2', contracted_at: daysAgo(1) }] }),
            ],
            NOW,
        );
        expect(m.frameworks).toEqual([
            { code: 'soc2', name: 'SOC 2', count: 3 },
            { code: 'iso27001', name: 'ISO 27001', count: 1 },
        ]);
        expect(m.isolation).toEqual({ dedicated: 1, shared: 3 });
    });
});
