import { useState } from "react";
import {
  Bell,
  BellRing,
  ChartNoAxesCombined,
  ChevronRight,
  FileText,
  FolderKanban,
  Import,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { MANAGEMENT_ROLES, USER_ROLES } from "../constants/roles";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { sessionCleared } from "../features/auth/authSlice";
import { logout as requestLogout } from "../services/authService";

const menuItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Hồ sơ", path: "/cases", icon: FolderKanban },
  {
    label: "Cảnh báo",
    path: "/alerts",
    icon: BellRing,
    allowedRoles: MANAGEMENT_ROLES,
  },
  { label: "Thông báo", path: "/notifications", icon: Bell },
  {
    label: "Thống kê & Báo cáo",
    path: "/reports",
    icon: ChartNoAxesCombined,
    allowedRoles: MANAGEMENT_ROLES,
  },
  {
    label: "Import dữ liệu",
    path: "/import",
    icon: Import,
    allowedRoles: [USER_ROLES.ADMIN],
  },
  {
    label: "Quản lý người dùng",
    path: "/users",
    icon: UsersRound,
    allowedRoles: [USER_ROLES.ADMIN],
  },
  // { label: "Phòng ban", path: "/departments", icon: Building2 },
  // { label: "Thủ tục", path: "/procedures", icon: Workflow },
  // { label: "Cài đặt", path: "/settings", icon: Settings },
];

const pageTitles = {
  "/": "Dashboard",
  "/cases": "Hồ sơ",
  "/alerts": "Cảnh báo",
  "/notifications": "Thông báo",
  "/reports": "Thống kê & Báo cáo",
  "/import": "Import dữ liệu",
  "/403": "Không có quyền truy cập",
  "/users": "Quản lý người dùng",
  "/departments": "Phòng ban",
  "/procedures": "Thủ tục",
  "/settings": "Cài đặt",
};

function getBreadcrumbs(pathname) {
  if (pathname === "/") return [{ label: "Dashboard", path: "/" }];

  const segments = pathname.split("/").filter(Boolean);

  return segments.map((_, index) => {
    const path = `/${segments.slice(0, index + 1).join("/")}`;
    return {
      label: pageTitles[path] ?? "Chi tiết hồ sơ",
      path,
    };
  });
}

function Sidebar({ isCollapsed, isMobileOpen, onNavigate, role }) {
  return (
    <aside
      className={`sidebar${isMobileOpen ? " sidebar--mobile-open" : ""}`}
      id="main-sidebar"
    >
      <div className="sidebar__brand">
        <div className="sidebar__logo" aria-hidden="true">
          <FileText size={22} strokeWidth={2.2} />
          <ShieldCheck className="sidebar__logo-badge" size={12} strokeWidth={2.6} />
        </div>
        <div className="sidebar__brand-text">
          <strong>HỆ THỐNG</strong>
          <span>QUẢN LÝ HỒ SƠ</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Điều hướng chính">
        {menuItems
          .filter(({ allowedRoles }) => (
            !allowedRoles || allowedRoles.includes(role)
          ))
          .map(({ label, path, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                `sidebar__link${isActive ? " sidebar__link--active" : ""}`
              }
              end={path === "/"}
              key={path}
              onClick={onNavigate}
              title={isCollapsed ? label : undefined}
              to={path}
            >
              <Icon className="sidebar__link-icon" size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}

function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span className="breadcrumbs__item" key={item.path}>
            {index > 0 && <ChevronRight size={13} aria-hidden="true" />}
            {isLast ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link to={item.path}>{item.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function getInitials(user) {
  const displayName = user?.fullName || user?.username || "U";
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Header({ breadcrumbs, isMobileOpen, logoutLoading, onChangePassword, onLogout, onToggleSidebar, user }) {
  return (
    <header className="app-header">
      <div className="app-header__start">
        <button
          aria-controls="main-sidebar"
          aria-label={isMobileOpen ? "Đóng menu" : "Mở hoặc thu gọn menu"}
          className="icon-button app-header__menu"
          type="button"
          onClick={onToggleSidebar}
        >
          <Menu size={20} />
        </button>
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <div className="app-header__actions">
        {/*<button className="icon-button app-header__search" type="button" aria-label="Tìm kiếm">*/}
        {/*  <Search size={20} />*/}
        {/*</button>*/}
        <Link className="icon-button notification-button" to="/notifications" aria-label="Thông báo">
          <Bell size={20} />
          <span className="notification-button__dot" />
        </Link>

        <div className="user-profile">
          <div className="user-profile__avatar" aria-hidden="true">{getInitials(user)}</div>
          <div className="user-profile__details">
            <strong>{user?.fullName || user?.username}</strong>
            <span>{user?.email || user?.username}</span>
          </div>
          <button
            aria-label="Đổi mật khẩu"
            className="icon-button logout-button"
            onClick={onChangePassword}
            title="Đổi mật khẩu"
            type="button"
          >
            <KeyRound size={17} />
          </button>
          <button
            aria-label="Đăng xuất"
            className="icon-button logout-button"
            disabled={logoutLoading}
            onClick={onLogout}
            title="Đăng xuất"
            type="button"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}

function MainLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { pathname } = useLocation();
  const breadcrumbs = getBreadcrumbs(pathname);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState("");

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 760px)").matches) {
      setIsMobileOpen((isOpen) => !isOpen);
      return;
    }

    setIsCollapsed((isOpen) => !isOpen);
  }

  function closeMobileSidebar() {
    setIsMobileOpen(false);
  }

  async function handleLogout() {
    if (logoutLoading) return;
    setLogoutLoading(true);

    try {
      await requestLogout();
    } finally {
      dispatch(sessionCleared());
      navigate("/login", { replace: true });
    }
  }

  return (
    <div
      className={`main-layout${isCollapsed ? " main-layout--collapsed" : ""}${
        isMobileOpen ? " main-layout--mobile-open" : ""
      }`}
    >
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onNavigate={closeMobileSidebar}
        role={user?.role}
      />
      {isMobileOpen && (
        <button
          aria-label="Đóng menu"
          className="sidebar-overlay"
          type="button"
          onClick={closeMobileSidebar}
        />
      )}
      <div className="main-layout__body">
        <Header
          breadcrumbs={breadcrumbs}
          isMobileOpen={isMobileOpen}
          logoutLoading={logoutLoading}
          onChangePassword={() => { setChangePasswordOpen(true); setAccountFeedback(""); }}
          onLogout={handleLogout}
          onToggleSidebar={toggleSidebar}
          user={user}
        />
        <main className="main-content">
          {accountFeedback && (
            <div className="layout-feedback" role="status">
              <span>{accountFeedback}</span>
              <button aria-label="Đóng thông báo" type="button" onClick={() => setAccountFeedback("")}>×</button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      {changePasswordOpen && (
        <ChangePasswordModal
          onClose={() => setChangePasswordOpen(false)}
          onSuccess={() => {
            setChangePasswordOpen(false);
            setAccountFeedback("Đổi mật khẩu thành công");
          }}
        />
      )}
    </div>
  );
}

export default MainLayout;
