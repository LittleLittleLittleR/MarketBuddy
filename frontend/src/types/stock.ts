
export interface StockResponse {
  ticker: string;
  company_name: string;
  current_price: number | null;
  open_price: number | null;
  currency: string | null;
  updated_at: string | null;
}

export interface StocklistDisplay {
  ticker: string;
  company_name: string;
  current_price: number | null;
  change_percent: number | null;
}

export interface RawStocklistStock {
  ticker: string;
  company_name: string;
  current_price: number | null;
  open_price: number | null;
}
