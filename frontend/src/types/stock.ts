
export interface StockResponse {
  ticker: string;
  company_name: string;
  current_price: number | null;
  open_price: number | null;
  currency: string | null;
  updated_at: string | null;
}

export interface WatchlistStockDisplay {
  ticker: string;
  company_name: string;
  current_price: number | null;
  change_percent: number | null;
}

export interface RawWatchlistStock {
  ticker: string;
  company_name: string;
  price: number | null;
  opening_price: number | null;
}
