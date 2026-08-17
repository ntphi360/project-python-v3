import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Search,
} from "lucide-react";

import "./CasesPage.css";

const PAGE_SIZE = 10;

const caseStatuses = [
  "Mới tiếp nhận",
  "Đang xử lý",
  "Sắp hạn",
  "Quá hạn",
  "Hoàn thành",
];

const emptyFilters = {
  search: "",
  status: "",
};

function formatDate(value) {
  if (!value) return "—";

  const [year, month, day] = value
    .slice(0, 10)
    .split("-");

  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return "—";

  const [date, time = ""] = value.split("T");

  return `${formatDate(date)}${
    time ? ` ${time.slice(0, 5)}` : ""
  }`;
}

function StatusBadge({ status }) {
  const statusKeys = {
    "Mới tiếp nhận": "new",
    "Đang xử lý": "processing",
    "Sắp hạn": "near-due",
    "Quá hạn": "overdue",
    "Hoàn thành": "completed",
  };

  return (
    <span
      className={`cases-status-badge cases-status-badge--${
        statusKeys[status] ?? "default"
      }`}
    >
      {status}
    </span>
  );
}

function CasesPage() {
  // bước sau lấy dữ liệu từ api
  const [caseList] = useState([]);

  const [draftFilters, setDraftFilters] =
    useState(emptyFilters);

  const [appliedFilters, setAppliedFilters] =
    useState(emptyFilters);

  const [currentPage, setCurrentPage] =
    useState(1);

  const filteredCases = useMemo(() => {
    return caseList.filter((caseItem) => {
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

      const matchesStatus =
        !appliedFilters.status ||
        caseItem.status === appliedFilters.status;

      return matchesSearch && matchesStatus;
    });
  }, [appliedFilters, caseList]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCases.length / PAGE_SIZE)
  );

  const pageCases = filteredCases.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function changeDraftFilter(name, value) {
    setDraftFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    setAppliedFilters(draftFilters);
    setCurrentPage(1);
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCurrentPage(1);
  }

  return (
    <section className="cases-page">
      <div className="cases-page__heading">
        <div>
          <h1>Quản lý hồ sơ</h1>

          <p>
            Theo dõi, tra cứu và quản lý hồ sơ
            hành chính.
          </p>
        </div>
      </div>

      <form
        className="cases-filter-card"
        onSubmit={applyFilters}
      >
        <label className="cases-filter-card__search">
          <span>Tìm kiếm</span>

          <div className="cases-search-input">
            <Search
              size={15}
              aria-hidden="true"
            />

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
          <span>Trạng thái</span>

          <select
            value={draftFilters.status}
            onChange={(event) =>
              changeDraftFilter(
                "status",
                event.target.value
              )
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

      <article className="cases-table-card">
        <div className="cases-table-card__header">
          <h2>Danh sách hồ sơ</h2>

          <span>
            {filteredCases.length} hồ sơ
          </span>
        </div>

        <div className="cases-table-wrap">
          <table className="cases-table">
            <thead>
              <tr>
                <th>Mã hồ sơ</th>
                <th>Chủ hồ sơ</th>
                <th>Thủ tục hành chính</th>
                <th>Phòng ban</th>
                <th>Người xử lý</th>
                <th>Ngày tiếp nhận</th>
                <th>Ngày hẹn trả</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {pageCases.map((caseItem) => (
                <tr key={caseItem.id}>
                  <td className="cases-table__code">
                    {caseItem.caseCode ?? "—"}
                  </td>

                  <td className="cases-table__name">
                    {caseItem.applicantName ?? "—"}
                  </td>

                  <td>
                    {caseItem.procedureName ?? "—"}
                  </td>

                  <td>
                    {caseItem.departmentName ?? "—"}
                  </td>

                  <td>
                    {caseItem.assigneeName ?? "—"}
                  </td>

                  <td>
                    {formatDate(
                      caseItem.receivedAt
                    )}
                  </td>

                  <td>
                    {formatDateTime(
                      caseItem.appointmentDate
                    )}
                  </td>

                  <td>
                    <StatusBadge
                      status={caseItem.status}
                    />
                  </td>
                </tr>
              ))}

              {!pageCases.length && (
                <tr>
                  <td
                    className="cases-table__empty"
                    colSpan="8"
                  >
                    Chưa có dữ liệu hồ sơ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="cases-pagination">
          <span>
            Trang {currentPage} / {totalPages}
          </span>

          <div>
            <button
              aria-label="Trang trước"
              disabled={currentPage === 1}
              type="button"
              onClick={() =>
                setCurrentPage(
                  (page) => page - 1
                )
              }
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              aria-label="Trang sau"
              disabled={
                currentPage === totalPages
              }
              type="button"
              onClick={() =>
                setCurrentPage(
                  (page) => page + 1
                )
              }
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}

export default CasesPage;