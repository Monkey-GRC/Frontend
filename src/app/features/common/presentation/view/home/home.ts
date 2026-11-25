import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { AccessKeyStatus, Company } from '@shared/models/company.model';
import { AttentionItem, AttentionReason, FrameworkCount, HomeMetrics, KeyBucket, computeHomeMetrics } from '@features/common/models/home-metrics.model';
import { HomeMetricsService } from '@features/common/services/home-metrics.service';
import { Card } from '@shared/presentation/components/card/card';
import { DataTable, TableColumn } from '@shared/presentation/components/data-table/data-table';
import { TableCell } from '@shared/presentation/components/data-table/data-table';
import { Donut } from '@shared/presentation/components/donut/donut';
import { MetricCard } from '@shared/presentation/components/metric-card/metric-card';
import { EmptyState } from '@shared/presentation/components/empty-state/empty-state';
import { PageHeader } from '@shared/presentation/components/page-header/page-header';
import { formatLocalDate } from '@shared/domain/utils/date-format';
import { Section } from '@shared/presentation/components/section/section';
import { StatusIndicator, StatusTone } from '@shared/presentation/components/status-indicator/status-indicator';
import { Busy } from '@shared/presentation/directives/busy';
import { Skeleton, SkeletonRegion } from '@shared/presentation/components/skeleton/skeleton';
import { Tag } from '@shared/presentation/components/tag/tag';

type Stage = 'loading' | 'error' | 'ready';

interface KeySegment {
    bucket: KeyBucket;
    labelKey: string;
    // Relleno por token: «usada» es estado ok, «vencida» avisa (warn) y el resto es neutro; cada fila lleva su nombre, su cifra y su porcentaje, así que el color no va solo.
    fill: string;
    tone: StatusTone;
    count: number;
    percent: number;
}

const KEY_LOOKS: { bucket: KeyBucket; labelKey: string; fill: string; tone: StatusTone }[] = [
    { bucket: 'used', labelKey: 'HOME.KEYS.USED', fill: 'bg-ok', tone: 'ok' },
    { bucket: 'pending', labelKey: 'HOME.KEYS.PENDING', fill: 'bg-neutral', tone: 'neutral' },
    { bucket: 'expired', labelKey: 'HOME.KEYS.EXPIRED', fill: 'bg-warn', tone: 'warn' },
    { bucket: 'revoked', labelKey: 'HOME.KEYS.REVOKED', fill: 'bg-ink-faint', tone: 'neutral' },
    { bucket: 'none', labelKey: 'HOME.KEYS.NONE', fill: 'bg-tint-strong', tone: 'neutral' },
];

const ATTENTION_TONE: Record<AttentionReason, StatusTone> = { key_expired: 'warn', onboarding_pending: 'neutral', suspended: 'neutral' };
const ATTENTION_LABEL: Record<AttentionReason, string> = {
    key_expired: 'HOME.ATTENTION.KEY_EXPIRED',
    onboarding_pending: 'HOME.ATTENTION.ONBOARDING_PENDING',
    suspended: 'HOME.ATTENTION.SUSPENDED',
};

// El home de Monkey Admin: un resumen de las empresas con lo que ya devuelve el backend (`GET /v1/companies`). Las tarjetas de arriba dan las
// cifras que se leen de un vistazo; debajo, el estado de las claves de acceso, lo que pide atención, las últimas altas y los marcos contratados.
@Component({
    selector: 'app-home',
    imports: [PageHeader, TranslateModule, RouterLink, Card, Section, MetricCard, Donut, EmptyState, DataTable, TableCell, StatusIndicator, Tag, Busy, Skeleton, SkeletonRegion],
    templateUrl: './home.html',
    styleUrl: './home.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
    private readonly metricsService = inject(HomeMetricsService);
    private readonly translate = inject(TranslateService);

    readonly stage = signal<Stage>('loading');
    private requesting = false;
    readonly metrics = signal<HomeMetrics | null>(null);
    readonly total = signal(0);
    readonly updatedAt = signal<Date | null>(null);

    // El idioma como señal: las fechas se vuelven a escribir solas cuando cambia.
    private readonly lang = toSignal(this.translate.onLangChange.pipe(map((e) => e.lang)), {
        initialValue: this.translate.currentLang || localStorage.getItem('lang') || 'es',
    });

    readonly keyColumns: TableColumn<KeySegment>[] = [
        { key: 'label', headerKey: 'HOME.KEYS.TITLE' },
        { key: 'count', headerKey: 'HOME.KEYS.TITLE', align: 'right' },
        { key: 'percent', headerKey: 'HOME.KEYS.TITLE', align: 'right', class: 'w-16' },
    ];
    readonly attentionColumns: TableColumn<AttentionItem>[] = [{ key: 'company', headerKey: 'HOME.ATTENTION.TITLE' }];
    readonly recentColumns: TableColumn<Company>[] = [
        { key: 'name', headerKey: 'HOME.RECENT.COL_COMPANY' },
        { key: 'date', headerKey: 'HOME.RECENT.COL_DATE' },
        { key: 'key', headerKey: 'HOME.RECENT.COL_KEY' },
    ];
    readonly frameworkColumns: TableColumn<FrameworkCount>[] = [
        { key: 'name', headerKey: 'HOME.FRAMEWORKS.TITLE' },
        { key: 'count', headerKey: 'HOME.FRAMEWORKS.TITLE', align: 'right' },
    ];
    readonly keyRowKey = (s: KeySegment) => s.bucket;
    readonly attentionRowKey = (item: AttentionItem) => item.company.id;
    readonly recentRowKey = (c: Company) => c.id;
    readonly frameworkRowKey = (f: FrameworkCount) => f.code;
    // Las cifras son parciales si hay más empresas que las que se alcanzaron a leer.
    readonly partial = computed(() => {
      const metrics = this.metrics();
      return !!metrics && this.total() > metrics.total;
    });

    readonly keySegments = computed<KeySegment[]>(() => {
        const m = this.metrics();
        if (!m || m.total === 0) return [];
        return KEY_LOOKS.map((look) => ({ ...look, count: m.keys[look.bucket], percent: Math.round((m.keys[look.bucket] / m.total) * 100) })).filter((s) => s.count > 0);
    });

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        if (this.requesting) return;
        this.requesting = true;
        this.stage.set('loading');
        this.metricsService.readAll().subscribe({
            next: ({ companies, total }) => {
                this.metrics.set(computeHomeMetrics(companies, new Date(), undefined, this.lang()));
                this.total.set(total);
                this.updatedAt.set(new Date());
                this.requesting = false;
                this.stage.set('ready');
            },
            error: () => {
                this.requesting = false;
                this.stage.set('error');
            },
        });
    }

    toneOf(reason: AttentionReason): StatusTone {
        return ATTENTION_TONE[reason];
    }

    labelOf(reason: AttentionReason): string {
        return ATTENTION_LABEL[reason];
    }

    // Parte de un todo como porcentaje entero (truncado, como lo entrega el backend en el resto del producto).
    share(part: number, whole: number): number {
        return whole > 0 ? Math.floor((part / whole) * 100) : 0;
    }

    keyStatusLook(status: AccessKeyStatus | null) {
        return KEY_LOOKS.find((l) => l.bucket === (status ?? 'none')) ?? KEY_LOOKS[KEY_LOOKS.length - 1];
    }

    date(value: string): string {
        return formatLocalDate(value, this.lang()) || value;
    }

    time(value: Date): string {
        return value.toLocaleTimeString(this.lang(), { hour: '2-digit', minute: '2-digit' });
    }
}
