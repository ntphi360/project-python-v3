import { Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import DashboardPage from "../pages/DashboardPage";
import CasesPage from "../pages/CasesPage";
import AlertsPage from "../pages/AlertsPage";
import NotificationsPage from "../pages/NotificationsPage";
import ReportsPage from "../pages/ReportsPage";
import ImportPage from "../pages/ImportPage";
import LoginPage from "../pages/LoginPage";
import { ProtectedRoute, PublicOnlyRoute } from "./AuthRoutes";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />

          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:id" element={<CasesPage />} />

          <Route path="alerts" element={<AlertsPage />} />

          <Route
            path="notifications"
            element={<NotificationsPage />}
          />

          <Route path="reports" element={<ReportsPage />} />

          <Route path="import" element={<ImportPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
