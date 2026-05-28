
export interface StockResponse {
  ticker: string;
  company_name: string;
  current_price: number;
  open_price: number;
  currency: string;
  updated_at: string;
}

export interface WatchlistStockDisplay {
  ticker: string;
  company_name: string;
  current_price: number;
  change_percent: number;
}