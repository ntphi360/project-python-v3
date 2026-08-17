import { useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  Files,
  Filter,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";

import "./ReportsPage.css";

const caseStatuses = [
  "Mới tiếp nhận",
  "Đang xử lý",
  "Sắp hạn",
  "Quá hạn",
  "Hoàn thành",
];

const emptyFilters = {
  fromDate: "",
  toDate: "",
  status: "",
};

function ReportsPage() {
  // sau này lấy dữ liệu từ api
  const [reportData] = useState({
    totalCases: 0,
    processingCases: 0,
    completedCases: 0,
    upcomingCases: 0,
    overdueCases: 0,
    onTimeRate: 0,

    timelineData: [],
    statusData: [],
    fieldData: [],
    departmentData: [],
    procedureRanking: [],
    userPerformance: [],
    overdueTrend: [],
    overdueCaseList: [],
  });

  const [draftFilters, setDraftFilters] =
    useState(emptyFilters);

  const [appliedFilters, setAppliedFilters] =
    useState(emptyFilters);

  const [exportFormat, setExportFormat] =
    useState("xlsx");

  const kpiCards = [
    {
      label: "Tổng hồ sơ",
      value: reportData.totalCases,
      icon: Files,
      tone: "blue",
    },
    {
      label: "Đang xử lý",
      value: reportData.processingCases,
      icon: Clock3,
      tone: "blue",
    },
    {
      label: "Đã hoàn thành",
      value: reportData.completedCases,
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "Sắp hạn",
      value: reportData.upcomingCases,
      icon: FileCheck2,
      tone: "orange",
    },
    {
      label: "Quá hạn",
      value: reportData.overdueCases,
      icon: TriangleAlert,
      tone: "red",
    },
    {
      label: "Tỷ lệ đúng hạn",
      value: `${reportData.onTimeRate}%`,
      icon: BarChart3,
      tone: "purple",
    },
  ];

  function applyFilters(event) {
    event.preventDefault();

    setAppliedFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  return (
    <section className="reports-page">
      <div className="reports-heading">
        <div>
          <h1>Thống kê &amp; Báo cáo</h1>

          <p>
            Theo dõi tình hình tiếp nhận,
            xử lý và tiến độ hồ sơ hành chính.
          </p>
        </div>

        <div className="report-export-ui">
          <select
            aria-label="Định dạng báo cáo"
            value={exportFormat}
            onChange={(event) =>
              setExportFormat(event.target.value)
            }
          >
            <option value="xlsx">
              Excel
            </option>

            <option value="csv">
              CSV
            </option>
          </select>

          <button
            disabled
            title="Chưa kết nối API xuất báo cáo"
            type="button"
          >
            <Download size={15} />
            Xuất báo cáo
          </button>
        </div>
      </div>

      <form
        className="report-filter-card"
        onSubmit={applyFilters}
      >
        <label>
          <span>Từ ngày</span>

          <input
            type="date"
            value={draftFilters.fromDate}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                fromDate: event.target.value,
              }))
            }
          />
        </label>

        <label>
          <span>Đến ngày</span>

          <input
            min={
              draftFilters.fromDate || undefined
            }
            type="date"
            value={draftFilters.toDate}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                toDate: event.target.value,
              }))
            }
          />
        </label>

        <label>
          <span>Trạng thái</span>

          <select
            value={draftFilters.status}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
          >
            <option value="">
              Tất cả trạng thái
            </option>

            {caseStatuses.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>
        </label>

        <div className="report-filter-actions">
          <button
            className="report-button report-button--secondary"
            type="button"
            onClick={resetFilters}
          >
            <RotateCcw size={14} />
            Đặt lại
          </button>

          <button
            className="report-button report-button--primary"
            type="submit"
          >
            <Filter size={14} />
            Lọc
          </button>
        </div>
      </form>

      <div
        className="report-kpi-grid"
        aria-label="Thống kê tổng quan"
      >
        {kpiCards.map(
          ({
            icon: Icon,
            label,
            tone,
            value,
          }) => (
            <article
              className={`report-kpi report-kpi--${tone}`}
              key={label}
            >
              <div>
                <span>{label}</span>

                <strong>
                  {typeof value === "number"
                    ? value.toLocaleString(
                        "vi-VN"
                      )
                    : value}
                </strong>
              </div>

              <span className="report-kpi__icon">
                <Icon size={20} />
              </span>
            </article>
          )
        )}
      </div>

      <div className="report-grid report-grid--primary">
        <ReportCard
          title="Hồ sơ theo thời gian"
          subtitle="Tiếp nhận và hoàn thành theo ngày"
        >
          <ChartEmptyState />
        </ReportCard>

        <ReportCard
          title="Cơ cấu trạng thái hồ sơ"
          subtitle="0 hồ sơ"
        >
          <ChartEmptyState />
        </ReportCard>
      </div>

      <div className="report-grid">
        <ReportCard
          title="Hồ sơ theo lĩnh vực"
          subtitle="Số hồ sơ của từng lĩnh vực"
        >
          <ChartEmptyState />
        </ReportCard>

        <ReportCard
          title="Hồ sơ theo phòng ban"
          subtitle="Tổng hồ sơ và hồ sơ quá hạn"
        >
          <ChartEmptyState />
        </ReportCard>
      </div>

      <ReportCard
        title="Hồ sơ theo thủ tục hành chính"
        subtitle="Top 5 thủ tục có nhiều hồ sơ nhất"
      >
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Thứ hạng</th>
                <th>
                  Tên thủ tục hành chính
                </th>
                <th>Lĩnh vực</th>
                <th>Số hồ sơ</th>
                <th>Quá hạn</th>
              </tr>
            </thead>

            <tbody>
              <EmptyRow columns={5} />
            </tbody>
          </table>
        </div>
      </ReportCard>

      <ReportCard
        title="Hiệu suất người xử lý"
        subtitle="Tỷ lệ đúng hạn trên hồ sơ đã hoàn thành"
      >
        <div className="report-table-wrap">
          <table className="report-table report-table--performance">
            <thead>
              <tr>
                <th>Người xử lý</th>
                <th>Phòng ban</th>
                <th>Tổng hồ sơ</th>
                <th>Đã hoàn thành</th>
                <th>Đúng hạn</th>
                <th>Trễ hạn</th>
                <th>Tỷ lệ đúng hạn</th>
              </tr>
            </thead>

            <tbody>
              <EmptyRow columns={7} />
            </tbody>
          </table>
        </div>
      </ReportCard>

      <ReportCard
        title="Xu hướng hồ sơ quá hạn"
        subtitle="Theo ngày hẹn trả của hồ sơ"
      >
        <ChartEmptyState />
      </ReportCard>

      <article className="report-card">
        <header className="report-card__header">
          <div>
            <h2>
              Hồ sơ quá hạn cần theo dõi
            </h2>

            <p>
              Top 10 hồ sơ trễ hẹn trả
              nhiều nhất
            </p>
          </div>

          <Link to="/cases">
            Xem tất cả
          </Link>
        </header>

        <div className="report-table-wrap">
          <table className="report-table report-table--overdue">
            <thead>
              <tr>
                <th>Mã hồ sơ</th>
                <th>Chủ hồ sơ</th>
                <th>Thủ tục</th>
                <th>Phòng ban</th>
                <th>Người xử lý</th>
                <th>Ngày tiếp nhận</th>
                <th>Ngày hẹn trả</th>
                <th>Ngày hoàn tất</th>
                <th>Số ngày trễ</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              <EmptyRow
                columns={10}
                label="Chưa có dữ liệu hồ sơ quá hạn."
              />
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function ReportCard({
  children,
  subtitle,
  title,
}) {
  return (
    <article className="report-card">
      <header className="report-card__header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </header>

      {children}
    </article>
  );
}

function ChartEmptyState() {
  return (
    <div className="report-chart">
      <div className="report-empty">
        <BarChart3 size={27} />

        <span>
          Chưa có dữ liệu báo cáo.
        </span>
      </div>
    </div>
  );
}

function EmptyRow({
  columns,
  label = "Chưa có dữ liệu.",
}) {
  return (
    <tr>
      <td
        className="report-table__empty"
        colSpan={columns}
      >
        {label}
      </td>
    </tr>
  );
}

export default ReportsPage;