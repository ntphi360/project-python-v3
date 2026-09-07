import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const { isAuthenticated, isInitializing, user } = useSelector(
    (state) => state.auth,
  );

  if (isInitializing) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/403" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const isAuthenticated = useSelector(
    (state) => state.auth.isAuthenticated,
  );

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
