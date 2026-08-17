import { useMemo, useState } from "react";
import {
  BellRing,
  CalendarClock,
  Clock3,
  Filter,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react";

import "./CasesPage.css";
import "./AlertsPage.css";

const alertLevels = [
  "Sắp hạn",
  "Đến hạn hôm nay",
  "Quá hạn",
];

const emptyFilters = {
  search: "",
  alertLevel: "",
};

function formatDateTime(value) {
  if (!value) return "—";

  const [date, time = ""] = value.split("T");
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}${
    time ? ` ${time.slice(0, 5)}` : ""
  }`;
}

function getAlertKey(level) {
  return {
    "Sắp hạn": "upcoming",
    "Đến hạn hôm nay": "today",
    "Quá hạn": "overdue",
  }[level];
}

function AlertBadge({ level }) {
  if (!level) return "—";

  return (
    <span
      className={`alert-badge alert-badge--${getAlertKey(
        level
      )}`}
    >
      {level}
    </span>
  );
}

function AlertsPage() {
  // sau này lấy dữ liệu từ api
  const [alertCases] = useState([]);

  const [draftFilters, setDraftFilters] =
    useState(emptyFilters);

  const [appliedFilters, setAppliedFilters] =
    useState(emptyFilters);

  const filteredCases = useMemo(() => {
    return alertCases.filter((caseItem) => {
      const search = appliedFilters.search
        .trim()
        .toLocaleLowerCase("vi");

      const caseCode = String(
        caseItem.caseCode ?? ""
      ).toLocaleLowerCase("vi");

      const applicantName = String(
        caseItem.applicantName ?? ""
      ).toLocaleLowerCase("vi");

      const matchesSearch =
        !search ||
        caseCode.includes(search) ||
        applicantName.includes(search);

      const matchesAlert =
        !appliedFilters.alertLevel ||
        caseItem.alertLevel ===
          appliedFilters.alertLevel;

      return matchesSearch && matchesAlert;
    });
  }, [alertCases, appliedFilters]);

  const alertCounts = alertLevels.reduce(
    (counts, level) => ({
      ...counts,

      [level]: alertCases.filter(
        (caseItem) =>
          caseItem.alertLevel === level
      ).length,
    }),
    {}
  );

  const kpiCards = [
    {
      label: "Tổng cảnh báo",
      value: alertCases.length,
      icon: BellRing,
      tone: "blue",
    },
    {
      label: "Sắp hạn",
      value: alertCounts["Sắp hạn"] ?? 0,
      icon: Clock3,
      tone: "orange",
    },
    {
      label: "Đến hạn hôm nay",
      value:
        alertCounts["Đến hạn hôm nay"] ?? 0,
      icon: CalendarClock,
      tone: "purple",
    },
    {
      label: "Quá hạn",
      value: alertCounts["Quá hạn"] ?? 0,
      icon: TriangleAlert,
      tone: "red",
    },
  ];

  function changeDraftFilter(name, value) {
    setDraftFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    setAppliedFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  return (
    <section className="alerts-page">
      <div className="alerts-page__heading">
        <h1>Cảnh báo hồ sơ</h1>

        <p>
          Theo dõi hồ sơ sắp hạn, đến hạn và
          quá hạn xử lý.
        </p>
      </div>

      <div
        className="alerts-kpi-grid"
        aria-label="Thống kê cảnh báo"
      >
        {kpiCards.map(
          ({
            icon: Icon,
            label,
            tone,
            value,
          }) => (
            <article
              className={`alerts-kpi alerts-kpi--${tone}`}
              key={label}
            >
              <span>
                <strong>{label}</strong>
                <b>{value}</b>
              </span>

              <i aria-hidden="true">
                <Icon size={20} />
              </i>
            </article>
          )
        )}
      </div>

      <form
        className="cases-filter-card alerts-filter-card"
        onSubmit={applyFilters}
      >
        <label>
          <span>Tìm kiếm</span>

          <div className="cases-search-input">
            <Search size={15} />

            <input
              placeholder="Mã hoặc chủ hồ sơ"
              value={draftFilters.search}
              onChange={(event) =>
                changeDraftFilter(
                  "search",
                  event.target.value
                )
              }
            />
          </div>
        </label>

        <label>
          <span>Loại cảnh báo</span>

          <select
            value={draftFilters.alertLevel}
            onChange={(event) =>
              changeDraftFilter(
                "alertLevel",
                event.target.value
              )
            }
          >
            <option value="">
              Tất cả cảnh báo
            </option>

            {alertLevels.map((level) => (
              <option
                key={level}
                value={level}
              >
                {level}
              </option>
            ))}
          </select>
        </label>

        <div className="cases-filter-card__actions">
          <button
            className="cases-button cases-button--primary"
            type="submit"
          >
            <Filter size={15} />
            Lọc
          </button>

          <button
            className="cases-button cases-button--secondary"
            type="button"
            onClick={resetFilters}
          >
            <RotateCcw size={15} />
            Đặt lại
          </button>
        </div>
      </form>

      <article className="cases-table-card alerts-table-card">
        <div className="cases-table-card__header">
          <h2>Danh sách cảnh báo</h2>

          <span>
            {filteredCases.length} hồ sơ
          </span>
        </div>

        <div className="cases-table-wrap">
          <table className="cases-table alerts-table">
            <thead>
              <tr>
                <th>Mã hồ sơ</th>
                <th>Chủ hồ sơ</th>
                <th>Thủ tục hành chính</th>
                <th>Phòng ban</th>
                <th>Người xử lý</th>
                <th>Hạn xử lý</th>
                <th>Ngày hẹn trả</th>
                <th>Mức cảnh báo</th>
              </tr>
            </thead>

            <tbody>
              {filteredCases.map(
                (caseItem) => (
                  <tr key={caseItem.id}>
                    <td className="cases-table__code">
                      {caseItem.caseCode ??
                        "—"}
                    </td>

                    <td className="cases-table__name">
                      {caseItem.applicantName ??
                        "—"}
                    </td>

                    <td>
                      {caseItem.procedureName ??
                        "—"}
                    </td>

                    <td>
                      {caseItem.departmentName ??
                        "—"}
                    </td>

                    <td>
                      {caseItem.assigneeName ??
                        "—"}
                    </td>

                    <td>
                      {formatDateTime(
                        caseItem.dueAt
                      )}
                    </td>

                    <td>
                      {formatDateTime(
                        caseItem.appointmentDate
                      )}
                    </td>

                    <td>
                      <AlertBadge
                        level={
                          caseItem.alertLevel
                        }
                      />
                    </td>
                  </tr>
                )
              )}

              {!filteredCases.length && (
                <tr>
                  <td
                    className="cases-table__empty"
                    colSpan="8"
                  >
                    Chưa có dữ liệu cảnh báo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export default AlertsPage;