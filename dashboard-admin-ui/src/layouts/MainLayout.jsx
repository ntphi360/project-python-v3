import {
  Bell,
  BellRing,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  FileText,
  FolderKanban,
  Import,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const menuItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Hồ sơ", path: "/cases", icon: FolderKanban },
  { label: "Cảnh báo", path: "/alerts", icon: BellRing },
  { label: "Thông báo", path: "/notifications", icon: Bell },
  { label: "Thống kê & Báo cáo", path: "/reports", icon: ChartNoAxesCombined },
  // { label: "Import dữ liệu", path: "/import", icon: Import },
  // { label: "Người dùng", path: "/users", icon: Users },
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
  "/users": "Người dùng",
  "/departments": "Phòng ban",
  "/procedures": "Thủ tục",
  "/settings": "Cài đặt",
};

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-text">
          <strong>HỆ THỐNG</strong>
          <span>QUẢN LÝ GIÁM SÁT HỒ SƠ TRỰC TUYẾN TRỄ HẠN</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Điều hướng chính">
        {menuItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            className={({ isActive }) =>
              `sidebar__link${isActive ? " sidebar__link--active" : ""}`
            }
            end={path === "/"}
            key={path}
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

function Header({ title }) {
  return (
    <header className="app-header">
      <div className="app-header__start">
        <button className="icon-button app-header__menu" type="button" aria-label="Mở menu">
          <Menu size={22} />
        </button>
        <div>
          <p className="app-header__eyebrow">Hệ thống quản lý giám sát hồ sơ trực tuyến trễ hạn</p>
          <h1 className="app-header__title">{title}</h1>
        </div>
      </div>

      <div className="app-header__actions">
        <button className="icon-button app-header__search" type="button" aria-label="Tìm kiếm">
          <Search size={20} />
        </button>
        <button className="icon-button notification-button" type="button" aria-label="Thông báo">
          <Bell size={20} />
          <span className="notification-button__dot" />
        </button>

        <div className="user-profile">
          <div className="user-profile__avatar" aria-hidden="true">NA</div>
          <div className="user-profile__details">
            <strong>Nguyễn Văn A</strong>
            <span>ADMIN</span>
          </div>
          <ChevronDown className="user-profile__chevron" size={16} />
        </div>
      </div>
    </header>
  );
}

function MainLayout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? "Quản lý hồ sơ";

  return (
    <div className="main-layout">
      <Sidebar />
      <div className="main-layout__body">
        <Header title={title} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
