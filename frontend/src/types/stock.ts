
export interface StockResponse {
  ticker: string;
  company_name: string;
  current_price: number | null;
  open_price: number | null;
  currency: string | null;
  updated_at: string | null;
}

// For watchlist_stock and summarylist_stock responses
export interface StocklistResponse {
  id: number;
  user_id: string;
  stock_ticker: string;
}

export interface WatchlistStockDisplay {
  ticker: string;
  company_name: string;
  current_price: number | null;
  change_percent: number | null;
  open_price: number | null;
}

export interface PortfoliolistStockDisplay {
  ticker: string;
  company_name: string;
  quantity: number;
  average_price: number;
  profit_loss: number;
  open_price: number | null;
  current_price: number | null;
}

export interface PortfolioListDisplay {
  id: number;
  name: string;
  stocks: PortfoliolistStockDisplay[];
}

export interface PortfolioNames {
  id: number;
  name: string;
  created_at: string;
}

export interface RawStocklistStock {
  ticker: string;
  company_name: string;
  current_price: number | null;
  open_price: number | null;
}
