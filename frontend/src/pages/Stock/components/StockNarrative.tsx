import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const VIDEO_POLL_INTERVAL_MS = 5000;
const MAX_VIDEO_POLLS = 36;

interface StockNarrativeProps {
  ticker: string;
}

interface VideoStatus {
  url: string | null;
  status: 'READY' | 'PENDING';
}

interface SummaryRow {
  ticker: string;
  summary: string;
  summary_date: string;
}

async function fetchLatestSummary(ticker: string): Promise<SummaryRow | null> {
  const { data, error } = await supabase
    .from('summaries')
    .select('ticker, summary, summary_date')
    .eq('ticker', ticker.toUpperCase())
    .order('summary_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as SummaryRow;
}

async function fetchLatestVideo(ticker: string): Promise<VideoStatus> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${API_BASE_URL}/api/videos/${encodeURIComponent(ticker)}/latest`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { url: null, status: 'PENDING' };
  return res.json();
}

export function StockNarrative({ ticker }: StockNarrativeProps) {
  const [summaryState, setSummaryState] = useState<{ ticker: string; data: SummaryRow | null } | null>(null);
  const [videoState, setVideoState] = useState<{ ticker: string; data: VideoStatus | null } | null>(null);

  // derive loading from whether the cached result belongs to the current ticker cause had issue using setState in useEffect
  const loadingSummary = summaryState?.ticker !== ticker;
  const loadingVideo = videoState?.ticker !== ticker;
  const summary = loadingSummary ? null : (summaryState?.data ?? null);
  const video = loadingVideo ? null : (videoState?.data ?? null);

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    fetchLatestSummary(ticker).then(data => {
      if (!cancelled) setSummaryState({ ticker, data });
    });

    // poll until the background build finishes; capped so a perpetually
    // failing generation doesn't re-trigger scrape+GPT+ffmpeg forever
    let attempts = 0;
    const stopPolling = () => {
      if (pollId) { clearInterval(pollId); pollId = undefined; }
    };

    const loadVideo = async () => {
      const data = await fetchLatestVideo(ticker);
      if (cancelled) return;
      setVideoState({ ticker, data });
      if (data.status === 'READY' || ++attempts >= MAX_VIDEO_POLLS) stopPolling();
    };

    loadVideo();
    pollId = setInterval(loadVideo, VIDEO_POLL_INTERVAL_MS);

    return () => { cancelled = true; stopPolling(); };
  }, [ticker]);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        AI Narrative
      </h3>

      {/* Summary */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
        {loadingSummary ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </div>
        ) : summary ? (
          <div className="space-y-1.5">
            <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-line">
              {summary.summary}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Updated {summary.summary_date}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No AI summary available yet for {ticker}. The daily scheduler will generate one tonight.
          </p>
        )}
      </div>

      {/* Video */}
      <div>
        {loadingVideo ? (
          <Skeleton className="w-full aspect-video rounded-lg" />
        ) : video?.status === 'READY' && video.url ? (
          <video
            src={video.url}
            controls
            className="w-full rounded-lg border border-border/60 bg-black"
            style={{ maxHeight: '340px' }}
          />
        ) : (
          <div className="rounded-lg border border-border/40 bg-muted/10 flex items-center justify-center h-24 text-xs text-muted-foreground">
            {video?.status === 'PENDING'
              ? 'Video is being generated — check back shortly.'
              : 'No video available for this stock yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
