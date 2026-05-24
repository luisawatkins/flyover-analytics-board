import type { BoardMetrics } from "../../shared/boardMetrics";
import { fmt } from "../lib/format";
import { LoadingSkeleton } from "./LoadingSkeleton";

type KpiGridProps = {
  data: BoardMetrics | null;
  loading: boolean;
};

export const KpiGrid = ({ data, loading }: KpiGridProps) => (
  <section className="kpi-grid" id="dashboard-metrics">
    <article className="card">
      <h2>24h Peg-in Volume</h2>
      <div className="value">
        {loading ? <LoadingSkeleton /> : `${fmt(data?.volume24h ?? 0)} RBTC`}
      </div>
    </article>
    <article className="card">
      <h2>7d Peg-in Volume</h2>
      <div className="value">
        {loading ? <LoadingSkeleton /> : `${fmt(data?.volume7d ?? 0)} RBTC`}
      </div>
    </article>
    <article className="card">
      <h2>Bridge TVL</h2>
      <div className="value">
        {loading ? <LoadingSkeleton /> : `${fmt(data?.tvl ?? 0)} RBTC`}
      </div>
    </article>
  </section>
);
