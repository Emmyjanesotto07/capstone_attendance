import { Navigate } from "react-router-dom";
import { clearAuthSession, parseJwtPayload, getAuthToken } from "../utils/authSession";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const token = getAuthToken();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  const payload = parseJwtPayload(token);

  if (!payload) {
    clearAuthSession();
    return <Navigate to="/" replace />;
  }

  const isExpired = payload.exp && Date.now() >= payload.exp * 1000;

  if (isExpired) {
    clearAuthSession();
    return <Navigate to="/" replace />;
  }

  const tokenRole = payload.role;

  if (allowedRoles.length > 0 && !allowedRoles.includes(tokenRole)) {
    if (tokenRole === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (["staff", "hr", "accounting"].includes(tokenRole)) {
      return <Navigate to="/staff/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}
