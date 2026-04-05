import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type RecordRow = {
  id: string;
  userId: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  entryDate: string;
  notes: string | null;
};

type ListResponse = { data: RecordRow[]; total: number; skip: number; take: number };

type UserOption = { id: string; email: string; role: string };

export function RecordsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [rows, setRows] = useState<RecordRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const take = 15;

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"" | "INCOME" | "EXPENSE">("");
  const [filterUserId, setFilterUserId] = useState("");

  const [users, setUsers] = useState<UserOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<RecordRow | null>(null);

  const [form, setForm] = useState({
    amount: "",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    category: "",
    entryDate: new Date().toISOString().slice(0, 10),
    notes: "",
    userId: "" as string,
  });

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api<{ data: UserOption[] }>("/users?skip=0&take=100");
      setUsers(res.data.map((u) => ({ id: u.id, email: u.email, role: u.role })));
    } catch {
      /* ignore */
    }
  }, [isAdmin]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({ skip: String(skip), take: String(take) });
      if (fromDate) q.set("fromDate", fromDate);
      if (toDate) q.set("toDate", toDate);
      if (category.trim()) q.set("category", category.trim());
      if (type) q.set("type", type);
      if (isAdmin && filterUserId.trim()) q.set("userId", filterUserId.trim());

      const res = await api<ListResponse>(`/records?${q.toString()}`);
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load records");
    }
  }, [skip, fromDate, toDate, category, type, filterUserId, isAdmin]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      amount: "",
      type: "EXPENSE",
      category: "",
      entryDate: new Date().toISOString().slice(0, 10),
      notes: "",
      userId: user?.id ?? "",
    });
    setModal("create");
  }

  function openEdit(r: RecordRow) {
    setEditing(r);
    setForm({
      amount: r.amount,
      type: r.type,
      category: r.category,
      entryDate: r.entryDate,
      notes: r.notes ?? "",
      userId: r.userId,
    });
    setModal("edit");
  }

  async function submitRecord() {
    setError(null);
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    const body: Record<string, unknown> = {
      amount,
      type: form.type,
      category: form.category.trim(),
      entryDate: form.entryDate,
      notes: form.notes.trim() || null,
    };
    if (isAdmin && modal === "create" && form.userId) {
      body.userId = form.userId;
    }
    try {
      if (modal === "create") {
        await api("/records", { method: "POST", body: JSON.stringify(body) });
      } else if (modal === "edit" && editing) {
        await api(`/records/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      setModal(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed");
    }
  }

  async function removeRow(r: RecordRow) {
    if (!confirm(`Delete record ${r.id.slice(0, 8)}…?`)) return;
    setError(null);
    try {
      await api(`/records/${r.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  const pageMax = Math.max(0, Math.ceil(total / take) - 1);
  const page = Math.floor(skip / take);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Financial records</h1>
        <button type="button" className="btn primary" onClick={openCreate}>
          New record
        </button>
      </div>
      <p className="muted">
        Analysts manage their own rows; admins see everyone and can filter by <code>userId</code>.
      </p>
      {error && <p className="error">{error}</p>}

      <div className="card filters">
        <div className="row wrap">
          <label>
            From
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <label>
            Category
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Salary"
            />
          </label>
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="">Any</option>
              <option value="INCOME">INCOME</option>
              <option value="EXPENSE">EXPENSE</option>
            </select>
          </label>
          {isAdmin && (
            <label>
              User ID
              <input
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                placeholder="uuid filter"
              />
            </label>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSkip(0);
              void load();
            }}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              {isAdmin && <th>Owner</th>}
              <th>Date</th>
              <th>Category</th>
              <th>Type</th>
              <th className="num">Amount</th>
              <th>Notes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="muted">
                  No records match.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  {isAdmin && (
                    <td className="mono small" title={r.userId}>
                      {r.userId.slice(0, 8)}…
                    </td>
                  )}
                  <td>{r.entryDate}</td>
                  <td>{r.category}</td>
                  <td>
                    <span className={`tag ${r.type === "INCOME" ? "income" : "expense"}`}>{r.type}</span>
                  </td>
                  <td className="num">${r.amount}</td>
                  <td className="ellipsis">{r.notes ?? "—"}</td>
                  <td className="actions">
                    <button type="button" className="btn link" onClick={() => openEdit(r)}>
                      Edit
                    </button>
                    <button type="button" className="btn link danger" onClick={() => void removeRow(r)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="pager">
          <button type="button" className="btn" disabled={page <= 0} onClick={() => setSkip((p) => Math.max(0, p - take))}>
            Prev
          </button>
          <span className="muted">
            Page {page + 1} / {Math.max(1, pageMax + 1)} — {total} total
          </span>
          <button
            type="button"
            className="btn"
            disabled={skip + take >= total}
            onClick={() => setSkip((p) => p + take)}
          >
            Next
          </button>
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal card" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === "create" ? "New record" : "Edit record"}</h2>
            <div className="form">
              {isAdmin && modal === "create" && (
                <label>
                  Owner (user)
                  <select value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
                    <option value="">— Me (current user) —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email} ({u.role})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Amount
                <input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </label>
              <label>
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "INCOME" | "EXPENSE" }))}
                >
                  <option value="INCOME">INCOME</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </label>
              <label>
                Category
                <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              </label>
              <label>
                Entry date
                <input
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
                />
              </label>
              <label>
                Notes
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
              </label>
            </div>
            <div className="row end">
              <button type="button" className="btn ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn primary" onClick={() => void submitRecord()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
