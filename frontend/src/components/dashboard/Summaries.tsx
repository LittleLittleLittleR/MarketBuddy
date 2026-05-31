import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

type Props = {
  summaryList: string[];
  isFetching: boolean;
  onFetchSummaries: () => Promise<void>
  disableFetch: boolean;
}

const Summaries = ({ summaryList, isFetching, onFetchSummaries, disableFetch }: Props) => {
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

        <Button
          onClick={onFetchSummaries}
          disabled={isFetching || disableFetch}
        >
          {isFetching
            ? 'Generating...'
            : 'Generate Summary'}
        </Button>
      </div>

      {summaryList.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-muted-foreground">
              No summaries generated yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {summaryList.map((summary, index) => (
            <Card
              key={index}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />

                  <span className="text-sm font-medium text-muted-foreground">
                    Summary #{index + 1}
                  </span>
                </div>

                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: summary
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br />')
                  }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>

  )
}

export default Summaries;
