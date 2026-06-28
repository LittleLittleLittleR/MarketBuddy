import type { SummaryPayload } from "@/hooks/summary";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { formatSummaryHtmlList } from "@/lib/share";

type Props = {
  summaries: SummaryPayload[];
  isFetching: boolean;
  onFetchSummaries: () => Promise<void>;
  onShareSummaries: () => void;
  disableFetch: boolean;
};

const Summaries = ({ summaries, isFetching, onFetchSummaries, onShareSummaries, disableFetch }: Props) => {

  return (
    <div className="mt-8 whitespace-pre-line text-gray-300">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            AI Market Summaries
          </h2>

          <p className="text-muted-foreground">
            Generate AI-powered summaries for your watchlist
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onShareSummaries}
            disabled={summaries.length === 0}
          >
            Share Summaries
          </Button>

          <Button
            onClick={onFetchSummaries}
            disabled={isFetching || disableFetch}
          >
            {isFetching ? "Generating..." : "Generate Summary"}
          </Button>
        </div>
      </div>

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-muted-foreground">
              No summaries generated yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary, index) => {
            if (!summary || !summary.summary) return null;

            return (
              <Card
                key={index}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Summary #{index + 1}: {summary.ticker || "Ticker not available"}
                    </span>
                  </div>

                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: summary.summary
                        ? summary.summary
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\n/g, "<br />")
                        : "<em>Summary unavailable.</em>",
                    }}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default Summaries;
