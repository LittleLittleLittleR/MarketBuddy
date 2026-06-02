import { summarylistStockService } from '@/db/summarylist_stock';
import { fetchTickerSummaries } from '@/api/summary';

interface Props {
  setSummarylist: (summary: string[]) => void; 
}

export const stockSummaryUpdater = async ({ setSummarylist }: Props) => {
  try {
    const tickers = (await summarylistStockService.getMySummarylistStocks()).map(s => s.stock_ticker);

    if (!tickers.length) return;
      
    const data = await fetchTickerSummaries(tickers);

    if (data.length) {
      setSummarylist(data);
    }

  } catch (err) {
    console.error('Polling error:', err);
  }
};