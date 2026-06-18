
export interface TradeDisplay {
  id: number;
  portfolio_id: number;
  ticker: string;
  quantity: number;
  entry_cost: number;
  fees: number | null;
  notes: string | null;
  trade_date: string | null;
  side: 'buy' | 'sell';
}

export interface PortfolioTradeDisplay {
  id: number;
  name: string;
  trades: TradeDisplay[];
}

export interface TradeRequest {
  portfolio_id: number;
  ticker: string;
  quantity: number;
  entry_cost: number;
  fees: number | null;
  notes: string | null;
  trade_date: string | null;
  side: 'buy' | 'sell';
}