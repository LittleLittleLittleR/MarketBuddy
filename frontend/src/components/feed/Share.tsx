import { Download } from 'lucide-react'
import { jsPDF } from 'jspdf'

import type { SummaryPayload } from '@/hooks/summary'
import { Button } from '@/components/ui/button'

type SharePopupProps = {
  isOpen: boolean
  onClose: () => void
  summaries: SummaryPayload[]
  userEmail: string
}

const stripMarkdown = (value: string) => value.replace(/\*\*(.*?)\*\*/g, '$1')

const downloadSummariesAsPdf = (summaries: SummaryPayload[]) => {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const leftMargin = 14
  const topMargin = 18
  const contentWidth = pageWidth - 28
  const lineHeight = 6

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('MarketBuddy Shared Summaries', leftMargin, topMargin)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.text(`Generated on ${new Date().toLocaleString()}`, leftMargin, topMargin + 8)

  let cursorY = topMargin + 18

  summaries.forEach((summary, index) => {
    const title = `${index + 1}. ${summary.ticker}`
    const body = pdf.splitTextToSize(stripMarkdown(summary.summary), contentWidth)

    if (cursorY > pageHeight - 24) {
      pdf.addPage()
      cursorY = topMargin
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.text(title, leftMargin, cursorY)
    cursorY += lineHeight + 1

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)

    body.forEach((line: string) => {
      if (cursorY > pageHeight - 16) {
        pdf.addPage()
        cursorY = topMargin
      }

      pdf.text(line, leftMargin, cursorY)
      cursorY += lineHeight
    })

    cursorY += 4
  })

  pdf.save(`marketbuddy-summaries-${Date.now()}.pdf`)
}

export function SharePopup({ isOpen, onClose, summaries }: SharePopupProps) {
  if (!isOpen) return null

  const handleExportPdf = () => {
    if (summaries.length === 0) return

    downloadSummariesAsPdf(summaries)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl rounded-xl border bg-background p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Share your summaries</h2>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Button variant="outline" className="justify-start gap-2" onClick={handleExportPdf} disabled={summaries.length === 0}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {summaries.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Generate summaries first, then use this panel to share them.
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Sharing {summaries.length} summar{summaries.length === 1 ? 'y' : 'ies'}.
          </p>
        )}
      </div>
    </div>
  )
}