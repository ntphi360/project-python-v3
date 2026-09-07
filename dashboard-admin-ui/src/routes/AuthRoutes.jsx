import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isInitializing } = useSelector(
    (state) => state.auth,
  );

  if (isInitializing) return null;

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location }} />;
}

export function PublicOnlyRoute() {
  const isAuthenticated = useSelector(
    (state) => state.auth.isAuthenticated,
  );

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
