import { Skeleton } from '@/components/ui/skeleton';
import type { StockProfile } from '@/types/candles';

interface KeyStatsProps {
  profile: StockProfile | null | undefined;
  isLoading: boolean;
}

function fmt(val: number | null | undefined, prefix = '', suffix = '', decimals = 2): string {
  if (val == null) return '—';
  return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

function fmtLarge(val: number | null | undefined): string {
  if (val == null) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toLocaleString()}`;
}

function fmtVol(val: number | null | undefined): string {
  if (val == null) return '—';
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return `${val}`;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-xs font-mono font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function KeyStats({ profile, isLoading }: KeyStatsProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!profile) {
    return <p className="text-xs text-muted-foreground">No profile data available.</p>;
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Key Stats
      </h3>
      <div className="divide-y divide-border/40">
        <StatRow label="Market Cap" value={fmtLarge(profile.market_cap)} />
        <StatRow label="P/E Ratio" value={fmt(profile.pe_ratio, '', 'x')} />
        <StatRow label="EPS" value={fmt(profile.eps, '$')} />
        <StatRow label="52W High" value={fmt(profile.fifty_two_week_high, '$')} />
        <StatRow label="52W Low" value={fmt(profile.fifty_two_week_low, '$')} />
        <StatRow label="Day High" value={fmt(profile.day_high, '$')} />
        <StatRow label="Day Low" value={fmt(profile.day_low, '$')} />
        <StatRow label="Volume" value={fmtVol(profile.volume)} />
        <StatRow label="Avg Volume" value={fmtVol(profile.avg_volume)} />
        <StatRow label="Div Yield" value={profile.dividend_yield != null ? `${(profile.dividend_yield * 100).toFixed(2)}%` : '—'} />
        <StatRow label="Sector" value={profile.sector ?? '—'} />
        <StatRow label="Exchange" value={profile.exchange ?? '—'} />
        <StatRow label="Currency" value={profile.currency ?? '—'} />
      </div>
    </div>
  );
}
