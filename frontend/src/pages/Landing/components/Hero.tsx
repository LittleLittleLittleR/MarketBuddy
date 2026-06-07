import { Button } from "@/components/ui/button"
import { Bell, TrendingUp, Zap } from "lucide-react"
import { Link } from "react-router-dom"


const Hero = () => {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
          Stock news that matter to you.
        </h1>
        <p className="text-lg text-muted-foreground text-pretty">
          Stop manually checking tickers. MarketBuddy delivers AI-powered summaries of everything that matters about your watchlist, every day.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link to="/signup">
            <Button size="lg" className="w-full sm:w-40">
              Get Started
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-40">
              Sign In
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mt-24">
        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-foreground" />
          </div>
          <h3 className="font-medium">Automated Tracking</h3>
          <p className="text-sm text-muted-foreground">
            Your watchlist monitored 24/7 without any manual effort.
          </p>
        </div>

        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Zap className="w-5 h-5 text-foreground" />
          </div>
          <h3 className="font-medium">AI Summaries</h3>
          <p className="text-sm text-muted-foreground">
            Complex news distilled into actionable insights in seconds.
          </p>
        </div>

        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Bell className="w-5 h-5 text-foreground" />
          </div>
          <h3 className="font-medium">Daily Reports</h3>
          <p className="text-sm text-muted-foreground">
            Curated updates pushed to you, not the other way around.
          </p>
        </div>
      </div>
    </main >
  )
}

export default Hero
