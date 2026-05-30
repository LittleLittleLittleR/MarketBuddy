import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between py-6">
        <h1 className="text-2xl font-bold">MarketBuddy</h1>

        <Link
          to="/login"
          className="px-4 py-2 rounded-lg border hover:bg-accent transition"
        >
          Login
        </Link>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-5xl font-bold mb-6">
          Stock news that matter to you.
        </h1>

        <div className="flex gap-4">
          <Link
            to="/signup"
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground"
          >
            Get Started
          </Link>

          <Link
            to="/login"
            className="px-6 py-3 rounded-lg border"
          >
            Sign In
          </Link>
        </div>
      </section>
    </div>
  );
}