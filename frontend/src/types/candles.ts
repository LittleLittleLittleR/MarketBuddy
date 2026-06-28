export interface Candle {
  // intraday = UNIX timestamp (number), daily = "YYYY-MM-DD" (string)
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleResponse {
  ticker: string;
  range: string;
  interval: string;
  candles: Candle[];
}

export interface StockProfile {
  ticker: string;
  company_name: string | null;
  currency: string | null;
  exchange: string | null;
  market_cap: number | null;
  pe_ratio: number | null;
  eps: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
  avg_volume: number | null;
  dividend_yield: number | null;
  sector: string | null;
}

export interface Earnings {
  ticker: string;
  earnings_date: string | null;
  eps_estimate: number | null;
  eps_actual: number | null;
  eps_surprise_pct: number | null;
  revenue_actual: number | null;
  operating_income: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  last_updated: string | null;
}

export type RangeOption = '1D' | '1W' | '1M' | '1Y';
