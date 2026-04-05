import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Summary = { totalIncome: string; totalExpense: string; net: string };
type CatRow = { category: string; type: string; total: string };
type RecentRow = {
  id: string;
  amount: string;
  type: string;
  category: string;
  entryDate: string;
  notes: string | null;
  userId: string;
};
type TrendRow = { periodStart: string; income: string; expense: string; net: string };

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 2);
  return {
    fromStr: from.toISOString().slice(0, 10),
    toStr: to.toISOString().slice(0, 10),
  };
}

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<CatRow[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<"week" | "month">("month");

  const initial = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initial.fromStr);
  const [to, setTo] = useState(initial.toStr);
  const [sumFrom, setSumFrom] = useState<string | undefined>(undefined);
  const [sumTo, setSumTo] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams();
      if (sumFrom) q.set("from", sumFrom);
      if (sumTo) q.set("to", sumTo);
      const qs = q.toString();
      const s = await api<Summary>(`/dashboard/summary${qs ? `?${qs}` : ""}`);
      setSummary(s);

      const cat = await api<{ data: CatRow[] }>(`/dashboard/by-category${qs ? `?${qs}` : ""}`);
      setCategories(cat.data);

      const rec = await api<{ data: RecentRow[] }>("/dashboard/recent?limit=8");
      setRecent(rec.data);

      const tq = new URLSearchParams({ granularity, from, to });
      const tr = await api<{ data: TrendRow[] }>(`/dashboard/trends?${tq.toString()}`);
      setTrends(tr.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load dashboard");
    }
  }, [sumFrom, sumTo, from, to, granularity]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="muted">
        Logged in as <strong>{user?.role}</strong>.{" "}
        {user?.role === "ADMIN"
          ? "Aggregates include all users (org-wide)."
          : "Aggregates are scoped to your user id."}
      </p>
      {error && <p className="error">{error}</p>}

      <section className="grid2">
        <div className="card">
          <h2>Summary filters</h2>
          <div className="row">
            <label>
              From
              <input type="date" value={sumFrom ?? ""} onChange={(e) => setSumFrom(e.target.value || undefined)} />
            </label>
            <label>
              To
              <input type="date" value={sumTo ?? ""} onChange={(e) => setSumTo(e.target.value || undefined)} />
            </label>
            <button type="button" className="btn" onClick={() => void load()}>
              Refresh
            </button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="kpi-grid">
          <div className="kpi card">
            <span className="kpi-label">Total income</span>
            <span className="kpi-value income">${summary.totalIncome}</span>
          </div>
          <div className="kpi card">
            <span className="kpi-label">Total expenses</span>
            <span className="kpi-value expense">${summary.totalExpense}</span>
          </div>
          <div className="kpi card">
            <span className="kpi-label">Net</span>
            <span className="kpi-value net">${summary.net}</span>
          </div>
        </section>
      )}

      <section className="grid2">
        <div className="card">
          <h2>By category</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Type</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    No data in this range.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={`${c.category}-${c.type}`}>
                    <td>{c.category}</td>
                    <td>
                      <span className={`tag ${c.type === "INCOME" ? "income" : "expense"}`}>{c.type}</span>
                    </td>
                    <td className="num">${c.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Recent activity</h2>
          <p className="muted small">
            Same scope as API <code>/dashboard/recent</code>. Viewers do not use the Records API.
          </p>
          <table className="table compact">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    Nothing recent.
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id}>
                    <td>{r.entryDate}</td>
                    <td>{r.category}</td>
                    <td className={`num ${r.type === "INCOME" ? "income" : "expense"}`}>${r.amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Trends</h2>
        <div className="row wrap">
          <label>
            Granularity
            <select value={granularity} onChange={(e) => setGranularity(e.target.value as "week" | "month")}>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>
          <label>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="button" className="btn" onClick={() => void load()}>
            Apply
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Period start</th>
              <th className="num">Income</th>
              <th className="num">Expense</th>
              <th className="num">Net</th>
            </tr>
          </thead>
          <tbody>
            {trends.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No buckets in range.
                </td>
              </tr>
            ) : (
              trends.map((t) => (
                <tr key={t.periodStart}>
                  <td>{t.periodStart}</td>
                  <td className="num income">${t.income}</td>
                  <td className="num expense">${t.expense}</td>
                  <td className="num">${t.net}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
