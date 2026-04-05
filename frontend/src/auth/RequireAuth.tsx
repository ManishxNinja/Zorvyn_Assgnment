import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { AuthUser } from "../api/client";

type Props = {
  children: ReactNode;
  roles?: AuthUser["role"][];
};

export function RequireAuth({ children, roles }: Props) {
  const { user, token, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
