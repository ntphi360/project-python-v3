import {
  CircleCheckBig,
  Clock3,
  Files,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import "./DashboardPage.css";

const kpiCards = [
  {
    title: "Tổng hồ sơ",
    value: "1,248",
    change: "12% so với tháng trước",
    trend: "up",
    icon: Files,
    tone: "blue",
  },
  {
    title: "Hồ sơ sắp hạn",
    value: "86",
    change: "9% so với tháng trước",
    trend: "down",
    icon: Clock3,
    tone: "orange",
  },
  {
    title: "Hồ sơ quá hạn",
    value: "24",
    change: "6% so với tháng trước",
    trend: "down",
    icon: TriangleAlert,
    tone: "red",
  },
  {
    title: "Đã hoàn thành",
    value: "1,038",
    change: "18% so với tháng trước",
    trend: "up",
    icon: CircleCheckBig,
    tone: "green",
  },
];

function DashboardPage() {
  return (<section className="dashboard-page">
      <div className="dashboard-page__heading">
        <h1>Dashboard</h1>
        <p>Tổng quan tình hình quản lý hồ sơ trong hệ thống.</p>
      </div>

      <div className="kpi-grid" aria-label="Thống kê tổng quan hồ sơ">
        {kpiCards.map(({ title, value, change, trend, icon: Icon, tone }) => {
          const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;

          return (
            <article className={`kpi-card kpi-card--${tone}`} key={title}>
              <div className="kpi-card__top">
                <span className="kpi-card__title">{title}</span>
                <span className="kpi-card__icon" aria-hidden="true">
                  <Icon size={21} strokeWidth={2} />
                </span>
              </div>
              <strong className="kpi-card__value">{value}</strong>
              <div className={`kpi-card__change kpi-card__change--${trend}`}>
                <TrendIcon size={14} strokeWidth={2.2} aria-hidden="true" />
                <span>{change}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default DashboardPage;