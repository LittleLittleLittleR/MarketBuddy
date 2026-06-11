import { Link, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { decodeSharedSummariesPayload, formatSummaryHtml } from '@/lib/share'

const SharedSummaries = () => {
  const [searchParams] = useSearchParams()
  const summaries = decodeSharedSummariesPayload(searchParams.get('data'))

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Shared feed</p>
          <h1 className="text-3xl font-bold tracking-tight">MarketBuddy summaries</h1>
          <p className="mt-2 text-muted-foreground">
            A public snapshot of the summaries that were shared with you.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            This share link does not contain any summaries.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary, index) => (
            <Card key={`${summary.ticker}-${index}`}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />

                  <span className="text-sm font-medium text-muted-foreground">
                    Summary #{index + 1}: {summary.ticker}
                  </span>
                </div>

                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: formatSummaryHtml(summary.summary),
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

export default SharedSummaries
