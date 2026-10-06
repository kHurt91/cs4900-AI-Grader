import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth() {
  const { session, isInitializing } = useAuth();
  if (isInitializing) return null;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
