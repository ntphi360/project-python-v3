import {
  useEffect,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

import {
  getCaseById,
  getCases,
} from "../services/caseService";

import "./CasesPage.css";

const PAGE_SIZE = 10;

const caseStatuses = [
  "Mới tiếp nhận",
  "Đang xử lý",
  "Sắp hạn",
  "Quá hạn",
  "Hoàn thành",
  "Đã hoàn thành",
];

const emptyFilters = {
  search: "",
  status: "",
  department: "",
  assignee: "",
  fromDate: "",
  toDate: "",
};


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const [year, month, day] = value
    .slice(0, 10)
    .split("-");

  return `${day}/${month}/${year}`;
}


function formatDateTime(value) {
  if (!value) {
    return "—";
  }

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
    "Đã hoàn thành": "completed",
  };

  return (
    <span
      className={`cases-status-badge cases-status-badge--${
        statusKeys[status] ?? "default"
      }`}
    >
      {status || "—"}
    </span>
  );
}


function CasesPage() {
  const [caseList, setCaseList] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    perPage: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [draftFilters, setDraftFilters] =
    useState(emptyFilters);

  const [appliedFilters, setAppliedFilters] =
    useState(emptyFilters);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [selectedCase, setSelectedCase] =
    useState(null);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [detailError, setDetailError] =
    useState("");


  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getCases(
          currentPage,
          PAGE_SIZE,
          appliedFilters
        );

        setCaseList(data?.items ?? []);

        setPagination(
          data?.pagination ?? {
            page: currentPage,
            perPage: PAGE_SIZE,
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          }
        );
      } catch (error) {
        console.error(error);

        setError(
          "Không thể tải danh sách hồ sơ."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [currentPage, appliedFilters]);


  async function openCaseDetail(caseId) {
    try {
      setSelectedCase(null);
      setDetailLoading(true);
      setDetailError("");

      const data = await getCaseById(caseId);

      setSelectedCase(data);
    } catch (error) {
      console.error(error);

      setDetailError(
        "Không thể tải chi tiết hồ sơ."
      );
    } finally {
      setDetailLoading(false);
    }
  }


  function closeCaseDetail() {
    setSelectedCase(null);
    setDetailError("");
    setDetailLoading(false);
  }


  function changeDraftFilter(name, value) {
    setDraftFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }


  function applyFilters(event) {
    event.preventDefault();

    setAppliedFilters({
      ...draftFilters,
    });

    setCurrentPage(1);
  }


  function resetFilters() {
    setDraftFilters({
      ...emptyFilters,
    });

    setAppliedFilters({
      ...emptyFilters,
    });

    setCurrentPage(1);
  }


  function goToPreviousPage() {
    if (!pagination.hasPrev) {
      return;
    }

    setCurrentPage((page) => page - 1);
  }


  function goToNextPage() {
    if (!pagination.hasNext) {
      return;
    }

    setCurrentPage((page) => page + 1);
  }


  return (
    <section className="cases-page">
      <div className="cases-page__heading">
        <div>
          <h1>Quản lý hồ sơ</h1>

          <p>
            Theo dõi, tra cứu và quản lý
            hồ sơ hành chính.
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
              placeholder="Mã hồ sơ, chủ hồ sơ, thủ tục..."
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


        <label>
          <span>Phòng ban</span>

          <input
            type="text"
            placeholder="Tên phòng ban..."
            value={draftFilters.department}
            onChange={(event) =>
              changeDraftFilter(
                "department",
                event.target.value
              )
            }
          />
        </label>


        <label>
          <span>Người xử lý</span>

          <input
            type="text"
            placeholder="Tên cán bộ..."
            value={draftFilters.assignee}
            onChange={(event) =>
              changeDraftFilter(
                "assignee",
                event.target.value
              )
            }
          />
        </label>


        <label>
          <span>Từ ngày tiếp nhận</span>

          <input
            type="date"
            value={draftFilters.fromDate}
            onChange={(event) =>
              changeDraftFilter(
                "fromDate",
                event.target.value
              )
            }
          />
        </label>


        <label>
          <span>Đến ngày tiếp nhận</span>

          <input
            type="date"
            value={draftFilters.toDate}
            onChange={(event) =>
              changeDraftFilter(
                "toDate",
                event.target.value
              )
            }
          />
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
            {pagination.total} hồ sơ
          </span>
        </div>


        {loading && (
          <div className="cases-table__empty">
            Đang tải dữ liệu...
          </div>
        )}


        {!loading && error && (
          <div className="cases-table__empty">
            {error}
          </div>
        )}


        {!loading && !error && (
          <>
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
                    <th>Hạn xử lý</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {caseList.map((caseItem) => (
                    <tr
                        key={caseItem.id}
                        className="cases-table__row"
                        onClick={() =>
                            openCaseDetail(caseItem.id)
                          }>
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
                        {formatDateTime(
                          caseItem.dueAt
                        )}
                      </td>

                      <td>
                        <StatusBadge
                          status={caseItem.status}
                        />
                      </td>

                      <td>
                        <button
                          type="button"
                          className="cases-detail-button"
                           onClick={(event) => {
                              event.stopPropagation();
                              openCaseDetail(caseItem.id);
                            }}>
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}


                  {!caseList.length && (
                    <tr>
                      <td
                        className="cases-table__empty"
                        colSpan="10"
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
                Trang {pagination.page} /{" "}
                {pagination.totalPages}
              </span>

              <div>
                <button
                  aria-label="Trang trước"
                  disabled={!pagination.hasPrev}
                  type="button"
                  onClick={goToPreviousPage}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  aria-label="Trang sau"
                  disabled={!pagination.hasNext}
                  type="button"
                  onClick={goToNextPage}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </article>


      {(selectedCase ||
        detailLoading ||
        detailError) && (
        <div
          className="case-modal"
          onClick={closeCaseDetail}
        >
          <div
            className="case-modal__dialog"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="case-modal__header">
              <h2>Chi tiết hồ sơ</h2>

              <button
                type="button"
                className="case-icon-button"
                aria-label="Đóng"
                onClick={closeCaseDetail}
              >
                <X size={18} />
              </button>
            </div>


            <div className="case-modal__body">
              {detailLoading && (
                <div className="cases-table__empty">
                  Đang tải chi tiết hồ sơ...
                </div>
              )}


              {!detailLoading &&
                detailError && (
                  <div className="cases-table__empty">
                    {detailError}
                  </div>
                )}


              {!detailLoading &&
                !detailError &&
                selectedCase && (
                  <dl className="case-details">
                    <div className="case-details__item">
                      <dt>Mã hồ sơ</dt>
                      <dd>
                        {selectedCase.caseCode ?? "—"}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Chủ hồ sơ</dt>
                      <dd>
                        {selectedCase.applicantName ?? "—"}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Số điện thoại</dt>
                      <dd>
                        {selectedCase.applicantPhone ?? "—"}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Đơn vị</dt>
                      <dd>
                        {selectedCase.agencyName ?? "—"}
                      </dd>
                    </div>


                    <div className="case-details__item case-details__item--wide">
                      <dt>Thủ tục hành chính</dt>
                      <dd>
                        {selectedCase.procedureName ?? "—"}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Phòng ban</dt>
                      <dd>
                        {selectedCase.departmentName ?? "—"}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Người xử lý</dt>
                      <dd>
                        {selectedCase.assigneeName ?? "—"}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Ngày tiếp nhận</dt>
                      <dd>
                        {formatDateTime(
                          selectedCase.receivedAt
                        )}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Ngày hẹn trả</dt>
                      <dd>
                        {formatDateTime(
                          selectedCase.appointmentDate
                        )}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Hạn xử lý</dt>
                      <dd>
                        {formatDateTime(
                          selectedCase.dueAt
                        )}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Ngày hoàn thành</dt>
                      <dd>
                        {formatDateTime(
                          selectedCase.completedAt
                        )}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Trạng thái</dt>
                      <dd>
                        <StatusBadge
                          status={selectedCase.status}
                        />
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Ưu tiên</dt>
                      <dd>
                        {selectedCase.priority ?? "—"}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Bước hiện tại</dt>
                      <dd>
                        {selectedCase.currentStepName ?? "—"}
                      </dd>
                    </div>


                    <div className="case-details__item">
                      <dt>Nguồn dữ liệu</dt>
                      <dd>
                        {selectedCase.sourceType ?? "—"}
                      </dd>
                    </div>
                  </dl>
                )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


export default CasesPage;