import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="logo">◆</span>
          <span>Finance Lab</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          {(user?.role === "ANALYST" || user?.role === "ADMIN") && (
            <NavLink to="/records" className={({ isActive }) => (isActive ? "active" : "")}>
              Records
            </NavLink>
          )}
          {user?.role === "ADMIN" && (
            <NavLink to="/users" className={({ isActive }) => (isActive ? "active" : "")}>
              Users
            </NavLink>
          )}
        </nav>
        <div className="userbox">
          <span className="pill">{user?.role}</span>
          <span className="email">{user?.email}</span>
          <button type="button" className="btn ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
