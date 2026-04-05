import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";

type UserRow = {
  id: string;
  email: string;
  role: "VIEWER" | "ANALYST" | "ADMIN";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

type ListResponse = { data: UserRow[]; total: number; skip: number; take: number };

export function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const take = 20;
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "VIEWER" as UserRow["role"],
    status: "ACTIVE" as UserRow["status"],
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<ListResponse>(`/users?skip=${skip}&take=${take}`);
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load users");
    }
  }, [skip, take]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser() {
    setError(null);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          status: form.status,
        }),
      });
      setModal(false);
      setForm({ email: "", password: "", role: "VIEWER", status: "ACTIVE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Create failed");
    }
  }

  async function patchUser(u: UserRow, patch: Partial<Pick<UserRow, "role" | "status">>) {
    setError(null);
    try {
      await api(`/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed");
    }
  }

  async function deactivate(u: UserRow) {
    if (!confirm(`Deactivate ${u.email}?`)) return;
    setError(null);
    try {
      await api(`/users/${u.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Deactivate failed");
    }
  }

  const page = Math.floor(skip / take);
  const pageMax = Math.max(0, Math.ceil(total / take) - 1);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Users</h1>
        <button type="button" className="btn primary" onClick={() => setModal(true)}>
          New user
        </button>
      </div>
      <p className="muted">Admin-only. Deleting a user sets them to INACTIVE (soft delete).</p>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) =>
                      void patchUser(u, { role: e.target.value as UserRow["role"] })
                    }
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td>
                  <select
                    value={u.status}
                    onChange={(e) =>
                      void patchUser(u, { status: e.target.value as UserRow["status"] })
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </td>
                <td className="small muted">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="actions">
                  <button type="button" className="btn link danger" onClick={() => void deactivate(u)}>
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pager">
          <button type="button" className="btn" disabled={page <= 0} onClick={() => setSkip((s) => Math.max(0, s - take))}>
            Prev
          </button>
          <span className="muted">
            Page {page + 1} / {Math.max(1, pageMax + 1)} — {total} total
          </span>
          <button
            type="button"
            className="btn"
            disabled={skip + take >= total}
            onClick={() => setSkip((s) => s + take)}
          >
            Next
          </button>
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(false)}>
          <div className="modal card" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Create user</h2>
            <div className="form">
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label>
                Password (min 8 chars)
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </label>
              <label>
                Role
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRow["role"] }))}
                >
                  <option value="VIEWER">VIEWER</option>
                  <option value="ANALYST">ANALYST</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as UserRow["status"] }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            </div>
            <div className="row end">
              <button type="button" className="btn ghost" onClick={() => setModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn primary" onClick={() => void createUser()}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
