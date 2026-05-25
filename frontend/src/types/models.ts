import type { Database } from "./supabase";

export type Stock = Database["public"]["Tables"]["stocks"]["Row"];
export type StockInsert = Database["public"]["Tables"]["stocks"]["Insert"];

export type Portfolio = Database["public"]["Tables"]["portfolios"]["Row"];
export type PortfolioInsert = Database["public"]["Tables"]["portfolios"]["Insert"];

export type Trade = Database["public"]["Tables"]["trades"]["Row"];
export type TradeInsert = Database["public"]["Tables"]["trades"]["Insert"];

export type WatchlistStock = Database["public"]["Tables"]["watchlist_stocks"]["Row"];
