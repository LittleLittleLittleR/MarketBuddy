import { fetchTickerSummaries } from '@/api/summary';
import { stockService } from '@/db/stock';

interface Props {
  setSummarylist: (summary: string[]) => void; 
}

export const stockSummaryUpdater = async ({ setSummarylist }: Props) => {
  try {
    const tickers = (await stockService.getStocks()).map(s => s.ticker);

    if (!tickers.length) return;
      
    const data = await fetchTickerSummaries(tickers);

    //sort summaries by how recently they were created
    data.sort((a: { created_at: Date; }, b: { created_at: Date; }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (data.length) {
      setSummarylist(data);
    }

  } catch (err) {
    console.error('Polling error:', err);
  }
};