import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { AccessKeyStatus } from '@features/companies/models/company.model';
import { AttentionReason, HomeMetrics, KeyBucket, RECENT_DAYS, computeHomeMetrics } from '@features/common/models/home-metrics.model';
import { HomeMetricsService } from '@features/common/services/home-metrics.service';
import { PageHeader } from '@shared/presentation/components/page-header/page-header';

type Stage = 'loading' | 'error' | 'ready';

interface KeySegment {
    bucket: KeyBucket;
    labelKey: string;
    icon: string;
    // Colores validados con el verificador de paletas (claro y oscuro). «Revocada» y «sin clave» van en gris neutro.
    fill: string;
    count: number;
    percent: number;
}

const KEY_LOOKS: { bucket: KeyBucket; labelKey: string; icon: string; fill: string }[] = [
    { bucket: 'used', labelKey: 'HOME.KEYS.USED', icon: 'check_circle', fill: 'bg-[#15803d] dark:bg-[#2aa05a]' },
    { bucket: 'pending', labelKey: 'HOME.KEYS.PENDING', icon: 'schedule', fill: 'bg-[#046cc4] dark:bg-[#3b82f6]' },
    { bucket: 'expired', labelKey: 'HOME.KEYS.EXPIRED', icon: 'timer_off', fill: 'bg-[#d97706] dark:bg-[#c4800c]' },
    { bucket: 'revoked', labelKey: 'HOME.KEYS.REVOKED', icon: 'block', fill: 'bg-gray-400 dark:bg-gray-500' },
    { bucket: 'none', labelKey: 'HOME.KEYS.NONE', icon: 'remove_circle_outline', fill: 'bg-gray-300 dark:bg-gray-600' },
];

const ATTENTION_ICON: Record<AttentionReason, { icon: string; tone: string }> = {
    key_expired: { icon: 'timer_off', tone: 'text-[#b45309] dark:text-[#e0a030]' },
    onboarding_pending: { icon: 'hourglass_empty', tone: 'text-[#046cc4] dark:text-[#5a9efe]' },
    suspended: { icon: 'pause_circle', tone: 'text-gray-600 dark:text-gray-300' },
};

// El home de Monkey Admin: un resumen de las empresas con lo que ya devuelve el backend (`GET /v1/companies`). Las tarjetas de arriba dan las
// cifras que se leen de un vistazo; debajo, el estado de las claves de acceso, lo que pide atención, las últimas altas y los marcos contratados.
@Component({
    selector: 'app-home',
    imports: [PageHeader, TranslateModule, RouterLink],
    templateUrl: './home.html',
    styleUrl: './home.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
    private readonly metricsService = inject(HomeMetricsService);
    private readonly translate = inject(TranslateService);

    readonly stage = signal<Stage>('loading');
    readonly metrics = signal<HomeMetrics | null>(null);
    readonly total = signal(0);
    readonly updatedAt = signal<Date | null>(null);

    // El idioma como señal: las fechas se vuelven a escribir solas cuando cambia.
    private readonly lang = toSignal(this.translate.onLangChange.pipe(map((e) => e.lang)), {
        initialValue: this.translate.currentLang || localStorage.getItem('lang') || 'es',
    });

    readonly attentionIcon = ATTENTION_ICON;
    readonly recentDays = RECENT_DAYS;
    // Las cifras son parciales si hay más empresas que las que se alcanzaron a leer.
    readonly partial = computed(() => !!this.metrics() && this.total() > this.metrics()!.total);

    readonly keySegments = computed<KeySegment[]>(() => {
        const m = this.metrics();
        if (!m || m.total === 0) return [];
        return KEY_LOOKS.map((look) => ({ ...look, count: m.keys[look.bucket], percent: Math.round((m.keys[look.bucket] / m.total) * 100) })).filter((s) => s.count > 0);
    });

    readonly maxFramework = computed(() => Math.max(1, ...(this.metrics()?.frameworks ?? []).map((f) => f.count)));

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.stage.set('loading');
        this.metricsService.readAll().subscribe({
            next: ({ companies, total }) => {
                this.metrics.set(computeHomeMetrics(companies));
                this.total.set(total);
                this.updatedAt.set(new Date());
                this.stage.set('ready');
            },
            error: () => this.stage.set('error'),
        });
    }

    percent(part: number, whole: number): number {
        return whole > 0 ? (part / whole) * 100 : 0;
    }

    keyStatusLabel(status: AccessKeyStatus | null): string {
        return KEY_LOOKS.find((l) => l.bucket === (status ?? 'none'))!.labelKey;
    }

    keyStatusLook(status: AccessKeyStatus | null) {
        return KEY_LOOKS.find((l) => l.bucket === (status ?? 'none'))!;
    }

    date(value: string): string {
        return new Date(value).toLocaleDateString(this.lang(), { day: 'numeric', month: 'short', year: 'numeric' });
    }

    time(value: Date): string {
        return value.toLocaleTimeString(this.lang(), { hour: '2-digit', minute: '2-digit' });
    }
}
