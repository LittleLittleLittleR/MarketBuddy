import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle, RangeOption } from '@/types/candles';
import type { LatestPrice } from '@/context/RealtimePriceContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface PriceChartProps {
  candles: Candle[];
  range: RangeOption;
  latestPrice: LatestPrice | null;
  isLoading: boolean;
}

type ChartMode = 'candle' | 'line';

interface HoverInfo {
  x: number;
  y: number;
  onLeft: boolean;
  time: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  value?: number;
}

const isIntraday = (range: RangeOption) => range === '1D' || range === '1W';

function formatHoverDate(time: number, range: RangeOption): string {
  const d = new Date(time * 1000);
  if (isIntraday(range)) {
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const fmt = (n?: number) => (n == null ? '—' : n.toFixed(2));

export function PriceChart({ candles, range, latestPrice, isLoading }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [mode, setMode] = useState<ChartMode>('candle');
  const [hover, setHover] = useState<HoverInfo | null>(null);

  useEffect(() => {
    if (!containerRef.current || !candles.length) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: '#09090b' },
        textColor: '#a1a1aa',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#18181b' },
        horzLines: { color: '#18181b' },
      },
      rightPriceScale: { borderColor: '#27272a' },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    let series: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>;

    if (mode === 'candle') {
      const cs = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      cs.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      candleSeriesRef.current = cs;
      series = cs;
    } else {
      const ls = chart.addSeries(LineSeries, {
        color: '#60a5fa',
        lineWidth: 2,
      });
      ls.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.close,
        }))
      );
      lineSeriesRef.current = ls;
      series = ls;
    }

    chart.timeScale().fitContent();

    // crosshair tooltip
    chart.subscribeCrosshairMove((param) => {
      const point = param.point;
      if (
        !param.time || !point ||
        point.x < 0 || point.y < 0 ||
        point.x > containerRef.current!.clientWidth ||
        point.y > containerRef.current!.clientHeight
      ) {
        setHover(null);
        return;
      }
      const data = param.seriesData.get(series) as
        | { open: number; high: number; low: number; close: number }
        | { value: number }
        | undefined;
      if (!data) {
        setHover(null);
        return;
      }
      setHover({
        x: point.x,
        y: point.y,
        onLeft: point.x > containerRef.current!.clientWidth / 2,
        time: param.time as number,
        ...('close' in data
          ? { open: data.open, high: data.high, low: data.low, close: data.close }
          : { value: data.value }),
      });
    });

    return () => {
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      setHover(null);
      chart.remove();
    };
  }, [candles, mode]);

  // extend the last real candle with the live tick — never append a detached bar.
  // skip when stale/closed so a frozen price can't overwrite the true close
  useEffect(() => {
    if (range !== '1D' || !latestPrice || latestPrice.stale || !latestPrice.market_open || !candles.length) return;
    const last = candles[candles.length - 1];
    const t = last.time as UTCTimestamp;
    candleSeriesRef.current?.update({
      time: t,
      open: last.open,
      high: Math.max(last.high, latestPrice.price),
      low: Math.min(last.low, latestPrice.price),
      close: latestPrice.price,
    });
    lineSeriesRef.current?.update({ time: t, value: latestPrice.price });
  }, [latestPrice, range, candles]);

  const tooltipOnLeft = hover?.onLeft ?? false;

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-20">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
      )}
      {!isLoading && !candles.length && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-muted-foreground">
          No chart data available for this range.
        </div>
      )}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-black/60 border border-zinc-700 rounded p-0.5">
        <Button
          variant="ghost" size="sm"
          onClick={() => setMode('candle')}
          className={`h-6 px-2 text-[10px] font-mono rounded ${mode === 'candle' ? 'bg-white text-black' : 'text-zinc-400'}`}
        >
          OHLC
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={() => setMode('line')}
          className={`h-6 px-2 text-[10px] font-mono rounded ${mode === 'line' ? 'bg-white text-black' : 'text-zinc-400'}`}
        >
          LINE
        </Button>
      </div>

      {hover && (
        <div
          className="absolute z-30 pointer-events-none rounded-md border border-zinc-700 bg-black/85 px-2.5 py-1.5 text-[10px] font-mono text-zinc-200 shadow-lg backdrop-blur-sm"
          style={{
            top: 8,
            left: tooltipOnLeft ? 8 : undefined,
            right: tooltipOnLeft ? undefined : 8,
          }}
        >
          <div className="mb-1 text-zinc-400">{formatHoverDate(hover.time, range)}</div>
          {hover.close != null ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-zinc-500">O</span><span>{fmt(hover.open)}</span>
              <span className="text-zinc-500">H</span><span>{fmt(hover.high)}</span>
              <span className="text-zinc-500">L</span><span>{fmt(hover.low)}</span>
              <span className="text-zinc-500">C</span><span>{fmt(hover.close)}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <span className="text-zinc-500">Price</span><span>{fmt(hover.value)}</span>
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
