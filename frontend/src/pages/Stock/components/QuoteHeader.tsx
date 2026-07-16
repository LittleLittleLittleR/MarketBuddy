import { Skeleton } from '@/components/ui/skeleton';
import type { StockProfile } from '@/types/candles';
import type { LatestPrice } from '@/context/RealtimePriceContext';

interface QuoteHeaderProps {
  symbol: string;
  profile: StockProfile | null | undefined;
  latestPrice: LatestPrice | null;
  isProfileLoading: boolean;
}

function PriceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-xs font-mono tabular-nums">{value}</span>
    </div>
  );
}

export function QuoteHeader({ symbol, profile, latestPrice, isProfileLoading }: QuoteHeaderProps) {
  // stale WS price → fall back to the fresh profile snapshot from yfinance
  const useProfilePrice = !!latestPrice?.stale && profile?.last_price != null;
  const price = useProfilePrice ? profile!.last_price : (latestPrice?.price ?? null);
  const open = useProfilePrice ? profile!.day_open : (latestPrice?.open ?? null);

  const change = price != null && open != null && open !== 0 ? price - open : null;
  const changePct = change != null && open != null && open !== 0 ? (change / open) * 100 : null;

  const isUp = change != null ? change >= 0 : null;

  const priceState = latestPrice?.stale
    ? { label: 'Delayed', className: 'text-amber-400' }
    : latestPrice?.market_open
      ? { label: 'Live', className: 'text-muted-foreground' }
      : { label: 'At Close', className: 'text-muted-foreground' };

  const fmtPrice = (v: number | null) => v != null ? `$${v.toFixed(2)}` : '—';
  const fmtChange = () => {
    if (change == null || changePct == null) return '—';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePct.toFixed(2)}%)`;
  };

  return (
    <div className="flex flex-col gap-1 pb-4 border-b border-border">
      {/* Symbol + company name row */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold font-mono tracking-tight">{symbol}</h1>
        {isProfileLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <span className="text-sm text-muted-foreground truncate">
            {profile?.company_name ?? ''}
          </span>
        )}
        {profile?.exchange && (
          <span className="ml-auto text-[10px] font-mono text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded">
            {profile.exchange}
          </span>
        )}
      </div>

      {/* Big price */}
      <div className="flex items-baseline gap-3 flex-wrap">
        {latestPrice ? (
          <>
            <span className="text-4xl font-mono font-semibold tabular-nums tracking-tight">
              {fmtPrice(price)}
            </span>
            <span
              className={`text-base font-mono font-medium tabular-nums ${
                isUp === true ? 'text-green-400' : isUp === false ? 'text-red-400' : 'text-muted-foreground'
              }`}
            >
              {fmtChange()}
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-wider self-center ${priceState.className}`}>
              {priceState.label}
            </span>
          </>
        ) : (
          <>
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-5 w-28" />
          </>
        )}
      </div>

      {/* Day stats strip */}
      <div className="flex items-center gap-6 pt-1 flex-wrap">
        <PriceStat label="Open" value={fmtPrice(open)} />
        <PriceStat label="Day High" value={fmtPrice(profile?.day_high ?? null)} />
        <PriceStat label="Day Low" value={fmtPrice(profile?.day_low ?? null)} />
        <PriceStat
          label="Volume"
          value={
            profile?.volume != null
              ? profile.volume >= 1e6
                ? `${(profile.volume / 1e6).toFixed(2)}M`
                : `${(profile.volume / 1e3).toFixed(1)}K`
              : '—'
          }
        />
        {profile?.currency && (
          <PriceStat label="Currency" value={profile.currency} />
        )}
      </div>
    </div>
  );
}
