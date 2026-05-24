import { useBoardMetrics } from "./hooks/useBoardMetrics";
import { KpiGrid } from "./components/KpiGrid";
import { VolumeChart } from "./components/VolumeChart";
import { PegInLatencyChart } from "./components/PegInLatencyChart";
import { LpLeaderboard } from "./components/LpLeaderboard";
import { formatUpdatedAt } from "./lib/format";
import "./App.css";

function App() {
  const { data, loading, error, lastUpdated } = useBoardMetrics();

  const scrollToMetrics = () => {
    document.getElementById("dashboard-metrics")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="board">
      <header className="hero-shell">
        <div className="hero-badge">The Bitcoin DeFi Layer</div>
        <h1 className="hero-title">
          <span className="hero-chip">Flyover</span>
          <span className="hero-strip">Analytics Board</span>
        </h1>
        <p>Do more with Bitcoin bridge intelligence for LPs and researchers.</p>
        <button className="hero-cta" type="button" onClick={scrollToMetrics}>
          Get Started
        </button>
      </header>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {lastUpdated
          ? `Metrics updated at ${formatUpdatedAt(lastUpdated)}`
          : loading
            ? "Loading metrics"
            : ""}
      </div>

      {error ? <p className="error" role="alert">API error: {error}</p> : null}

      <KpiGrid data={data} loading={loading} />

      <section className="two-col">
        <VolumeChart series={data?.volumeSeries ?? []} loading={loading} />
        <PegInLatencyChart quoteTimes={data?.quoteTimes ?? []} loading={loading} />
      </section>

      <LpLeaderboard rows={data?.leaderboard ?? []} loading={loading} />
    </main>
  );
}

export default App;
