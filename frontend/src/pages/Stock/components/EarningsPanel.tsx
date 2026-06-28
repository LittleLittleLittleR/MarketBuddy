import { Skeleton } from '@/components/ui/skeleton';
import type { Earnings } from '@/types/candles';

interface EarningsPanelProps {
  earnings: Earnings | null | undefined;
  isLoading: boolean;
}

function fmt(val: number | null | undefined, prefix = '', suffix = '', decimals = 2): string {
  if (val == null) return '—';
  return `${prefix}${val.toFixed(decimals)}${suffix}`;
}

function fmtRevenue(val: number | null | undefined): string {
  if (val == null) return '—';
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toFixed(0)}`;
}

function EarningsStat({ label, value, colored = false }: { label: string; value: string; colored?: boolean }) {
  const isPositive = colored && !value.startsWith('-') && value !== '—';
  const isNegative = colored && value.startsWith('-');

  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-muted/30 border border-border/40">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-mono font-semibold tabular-nums ${
          isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function EarningsPanel({ earnings, isLoading }: EarningsPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  const surpriseVal = earnings?.eps_surprise_pct;
  const surpriseStr = surpriseVal != null
    ? `${surpriseVal >= 0 ? '+' : ''}${surpriseVal.toFixed(2)}%`
    : '—';

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Earnings
        </h3>
        {earnings?.earnings_date && (
          <span className="text-[10px] font-mono text-muted-foreground">
            Next: {earnings.earnings_date}
          </span>
        )}
      </div>

      {!earnings ? (
        <p className="text-xs text-muted-foreground">No earnings data available.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <EarningsStat label="EPS Estimate" value={fmt(earnings.eps_estimate, '$')} />
          <EarningsStat label="EPS Actual" value={fmt(earnings.eps_actual, '$')} />
          <EarningsStat label="EPS Surprise" value={surpriseStr} colored />
          <EarningsStat label="Revenue" value={fmtRevenue(earnings.revenue_actual)} />
          <EarningsStat label="Gross Margin" value={fmt(earnings.gross_margin != null ? earnings.gross_margin * 100 : null, '', '%')} />
          <EarningsStat label="Op. Margin" value={fmt(earnings.operating_margin != null ? earnings.operating_margin * 100 : null, '', '%')} />
        </div>
      )}
    </div>
  );
}
