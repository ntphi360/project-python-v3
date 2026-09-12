import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  LoaderCircle,
  RotateCcw,
  Search,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";
import { useSelector } from "react-redux";

import { MANAGEMENT_ROLES } from "../constants/roles";
import {
  getCaseById,
  getCaseHistory,
} from "../services/caseService";
import {
  getAlerts,
  sendCaseReminder,
} from "../services/alertService";
import { getApiErrorMessage } from "../utils/apiError";
import {
  CaseDetailModal,
  CaseModal,
} from "./CasesPage";
import "./CasesPage.css";
import "./AlertsPage.css";

const PAGE_SIZE = 10;

const alertTypes = [
  { value: "NEAR_DUE", label: "Sắp hạn" },
  { value: "DUE_TODAY", label: "Đến hạn hôm nay" },
  { value: "OVERDUE", label: "Quá hạn" },
];

const reminderChannels = [
  { value: "SYSTEM", label: "Thông báo trong hệ thống" },
  { value: "EMAIL", label: "Email" },
  // { value: "ZALO", label: "Zalo" },
];

const reminderChannelLabels = Object.fromEntries(
  reminderChannels.map((channel) => [
    channel.value,
    channel.label,
  ])
);

const emptyFilters = {
  keyword: "",
  alertType: "",
  department: "",
  assignee: "",
};

const emptySummary = {
  total: 0,
  nearDue: 0,
  dueToday: 0,
  overdue: 0,
};

const emptyPagination = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

function formatDateTime(value) {
  if (!value) return "—";

  const [date, time = ""] = value.split("T");
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}${
    time ? ` ${time.slice(0, 5)}` : ""
  }`;
}

function formatDate(value) {
  if (!value) return "—";

  const [year, month, day] = value.slice(0, 10).split("-");

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

function formatCountdown(dueAt, currentTime) {
  const dueTime = new Date(dueAt).getTime();

  if (!Number.isFinite(dueTime)) {
    return {
      text: "—",
      tone: "upcoming",
    };
  }

  const difference = dueTime - currentTime;

  const totalSeconds = Math.floor(
    Math.abs(difference) / 1000
  );

  const days = Math.floor(
    totalSeconds / 86400
  );

  const hours = Math.floor(
    (totalSeconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds = totalSeconds % 60;

  const pad = (value) =>
    String(value).padStart(2, "0");

  const parts = [];

  if (days > 0) {
    parts.push(`${pad(days)} ngày`);
  }

  parts.push(`${pad(hours)} giờ`);
  parts.push(`${pad(minutes)} phút`);
  parts.push(`${pad(seconds)} giây`);

  const isOverdue =
    difference < 0;

  return {
    text: `${
      isOverdue ? "Quá hạn" : "Còn"
    } ${parts.join(" ")}`,
    tone: isOverdue
      ? "overdue"
      : "upcoming",
  };
}

function AlertCountdown({
  dueAt,
  currentTime,
}) {
  const countdown = formatCountdown(
    dueAt,
    currentTime
  );

  return (
    <span
      className={`alerts-countdown alerts-countdown--${countdown.tone}`}
    >
      {countdown.text}
    </span>
  );
}

function getAlertKey(alertType) {
  return {
    NEAR_DUE: "upcoming",
    DUE_TODAY: "today",
    OVERDUE: "overdue",
  }[alertType] ?? "upcoming";
}

function AlertBadge({
  alertType,
  label,
}) {
  if (!alertType) return "—";

  return (
    <span
      className={`alert-badge alert-badge--${getAlertKey(
        alertType
      )}`}
    >
      {label}
    </span>
  );
}

function buildDefaultReminder(caseItem) {
  if (caseItem.alertType === "DUE_TODAY") {
    return `Hồ sơ ${caseItem.caseCode} đến hạn xử lý trong hôm nay. Vui lòng ưu tiên kiểm tra và hoàn tất hồ sơ.`;
  }

  if (caseItem.alertType === "OVERDUE") {
    return `Hồ sơ ${
      caseItem.caseCode
    } đã ${caseItem.remainingText.toLocaleLowerCase(
      "vi"
    )}. Vui lòng kiểm tra và xử lý hồ sơ sớm nhất có thể.`;
  }

  return `Hồ sơ ${
    caseItem.caseCode
  } - ${
    caseItem.caseName ?? "Chưa có tên"
  } còn ${caseItem.remainingText
    .replace(/^Còn\s+/i, "")
    .toLocaleLowerCase(
      "vi"
    )} trước hạn xử lý. Vui lòng kiểm tra và xử lý hồ sơ đúng tiến độ.`;
}

function ReminderModal({
  caseItem,
  onClose,
  onSent,
}) {
  const [message, setMessage] =
    useState(() =>
      buildDefaultReminder(caseItem)
    );

  const [channels, setChannels] =
    useState(["SYSTEM"]);

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const submittingRef =
    useRef(false);

  const allChannelsSelected =
    channels.length ===
    reminderChannels.length;

  function toggleAllChannels() {
    setChannels(
      allChannelsSelected
        ? []
        : reminderChannels.map(
            (channel) =>
              channel.value
          )
    );

    setError("");
  }

  function toggleChannel(channel) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter(
            (value) =>
              value !== channel
          )
        : [
            ...current,
            channel,
          ]
    );

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    const normalizedMessage =
      message.trim();

    if (!normalizedMessage) {
      setError(
        "Nội dung nhắc nhở không được để trống."
      );

      return;
    }

    if (!channels.length) {
      setError(
        "Vui lòng chọn ít nhất một kênh gửi nhắc nhở."
      );

      return;
    }

    submittingRef.current =
      true;

    setSubmitting(true);
    setError("");

    try {
      const result =
        await sendCaseReminder(
          caseItem.caseId,
          normalizedMessage,
          channels
        );

      const channelResults =
        result?.results ?? {};

      const successfulChannels =
        Object.entries(
          channelResults
        )
          .filter(
            ([, channelResult]) =>
              channelResult.success
          )
          .map(
            ([channel]) =>
              channel
          );

      if (
        !successfulChannels.length
      ) {
        const failureMessage =
          Object.entries(
            channelResults
          )
            .map(
              ([
                channel,
                channelResult,
              ]) =>
                `${
                  reminderChannelLabels[
                    channel
                  ] ?? channel
                }: ${
                  channelResult.error
                }`
            )
            .join("; ");

        setError(
          failureMessage ||
            "Không gửi được nhắc nhở qua các kênh đã chọn."
        );

        return;
      }

      onSent(
        caseItem,
        channelResults
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Không thể gửi nhắc nhở."
        )
      );
    } finally {
      submittingRef.current =
        false;

      setSubmitting(false);
    }
  }

  return (
    <CaseModal
      onClose={
        submitting
          ? undefined
          : onClose
      }
      title="Gửi nhắc nhở"
    >
      <form
        className="reminder-form"
        onSubmit={handleSubmit}
      >
        <div className="case-modal__body reminder-form__body">
          <dl className="reminder-details">
            <div>
              <dt>Mã hồ sơ</dt>
              <dd>
                {caseItem.caseCode ?? "—"}
              </dd>
            </div>

            <div>
              <dt>Chủ hồ sơ</dt>
              <dd>
                {caseItem.caseName ?? "—"}
              </dd>
            </div>

            <div>
              <dt>Lĩnh vực</dt>
              <dd>
                {caseItem.fieldName ?? "—"}
              </dd>
            </div>

            <div>
              <dt>
                Thủ tục hành chính
              </dt>
              <dd>
                {caseItem.procedureName ?? "—"}
              </dd>
            </div>

            <div>
              <dt>Người xử lý</dt>
              <dd>
                {caseItem.assigneeName ??
                  "Chưa phân công"}
              </dd>
            </div>

            <div>
              <dt>Phòng ban</dt>
              <dd>
                {caseItem.departmentName ?? "—"}
              </dd>
            </div>

            <div>
              <dt>Email</dt>
              <dd>
                {caseItem.assigneeEmail ?? "—"}
              </dd>
            </div>

            <div>
              <dt>Số điện thoại</dt>
              <dd>
                {caseItem.assigneePhone ?? "—"}
              </dd>
            </div>

            <div>
              <dt>Hạn xử lý</dt>
              <dd>
                {formatDateTime(
                  caseItem.dueAt
                )}
              </dd>
            </div>

            <div>
              <dt>Thời hạn</dt>
              <dd
                className={`alerts-countdown alerts-countdown--${getAlertKey(
                  caseItem.alertType
                )}`}
              >
                {
                  caseItem.remainingText
                }
              </dd>
            </div>

            <div>
              <dt>Mức cảnh báo</dt>
              <dd>
                <AlertBadge
                  alertType={
                    caseItem.alertType
                  }
                  label={
                    caseItem.alertLabel
                  }
                />
              </dd>
            </div>
          </dl>

          <fieldset className="reminder-channels">
            <legend>
              Kênh gửi nhắc nhở
            </legend>

            <label className="reminder-channels__all">
              <input
                checked={
                  allChannelsSelected
                }
                type="checkbox"
                onChange={
                  toggleAllChannels
                }
              />

              Chọn tất cả
            </label>

            <div>
              {reminderChannels.map(
                (channel) => (
                  <label
                    key={
                      channel.value
                    }
                  >
                    <input
                      checked={channels.includes(
                        channel.value
                      )}
                      type="checkbox"
                      onChange={() =>
                        toggleChannel(
                          channel.value
                        )
                      }
                    />

                    {
                      channel.label
                    }
                  </label>
                )
              )}
            </div>
          </fieldset>

          <label className="reminder-message">
            <span>
              Nội dung nhắc nhở
            </span>

            <textarea
              maxLength="2000"
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
            />
          </label>

          {error && (
            <p
              className="reminder-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="case-modal__footer">
          <button
            className="cases-button cases-button--secondary"
            disabled={submitting}
            type="button"
            onClick={onClose}
          >
            Hủy
          </button>

          <button
            className="cases-button cases-button--primary"
            disabled={
              submitting ||
              !message.trim() ||
              !channels.length
            }
            type="submit"
          >
            {submitting ? (
              <LoaderCircle
                className="cases-spinner"
                size={14}
              />
            ) : (
              <Send size={14} />
            )}

            {submitting
              ? "Đang gửi..."
              : "Gửi nhắc nhở"}
          </button>
        </footer>
      </form>
    </CaseModal>
  );
}

function AlertsPage() {
  const role = useSelector(
    (state) =>
      state.auth.user?.role
  );

  const canSendReminder =
    MANAGEMENT_ROLES.includes(
      role
    );

  const [
    alertCases,
    setAlertCases,
  ] = useState([]);

  const [
    summary,
    setSummary,
  ] = useState(
    emptySummary
  );

  const [
    pagination,
    setPagination,
  ] = useState(
    emptyPagination
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    feedback,
    setFeedback,
  ] = useState(null);

  const [
    draftFilters,
    setDraftFilters,
  ] = useState(
    emptyFilters
  );

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(
    emptyFilters
  );

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    reminderCase,
    setReminderCase,
  ] = useState(null);

  const [
    selectedCase,
    setSelectedCase,
  ] = useState(null);

  const [
    caseHistory,
    setCaseHistory,
  ] = useState([]);

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    detailError,
    setDetailError,
  ] = useState("");

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  const [
    historyError,
    setHistoryError,
  ] = useState("");

  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    () => Date.now()
  );

  const detailRequestVersion =
    useRef(0);

  useEffect(() => {
    const countdownInterval =
      window.setInterval(
        () => {
          setCurrentTime(
            Date.now()
          );
        },
        1000
      );

    return () =>
      window.clearInterval(
        countdownInterval
      );
  }, []);

  useEffect(() => {
    let cancelled =
      false;

    async function fetchAlerts() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getAlerts(
            currentPage,
            PAGE_SIZE,
            appliedFilters
          );

        if (
          !cancelled
        ) {
          setAlertCases(
            data?.items ?? []
          );

          setSummary(
            data?.summary ??
              emptySummary
          );

          setPagination(
            data?.pagination ?? {
              ...emptyPagination,
              page:
                currentPage,
            }
          );
        }
      } catch (
        requestError
      ) {
        if (
          !cancelled
        ) {
          setAlertCases(
            []
          );

          setSummary(
            emptySummary
          );

          setError(
            getApiErrorMessage(
              requestError,
              "Không thể tải danh sách cảnh báo."
            )
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    fetchAlerts();

    return () => {
      cancelled =
        true;
    };
  }, [
    appliedFilters,
    currentPage,
  ]);

  const kpiCards = [
    {
      label:
        "Tổng cảnh báo",
      value:
        summary.total,
      icon:
        BellRing,
      tone:
        "blue",
    },
    {
      label:
        "Sắp hạn",
      value:
        summary.nearDue,
      icon:
        Clock3,
      tone:
        "orange",
    },
    {
      label:
        "Đến hạn hôm nay",
      value:
        summary.dueToday,
      icon:
        CalendarClock,
      tone:
        "purple",
    },
    {
      label:
        "Quá hạn",
      value:
        summary.overdue,
      icon:
        TriangleAlert,
      tone:
        "red",
    },
  ];

  function changeDraftFilter(
    name,
    value
  ) {
    setDraftFilters(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  function applyFilters(
    event
  ) {
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

  function openReminder(
    caseItem
  ) {
    if (
      !canSendReminder ||
      !caseItem.assigneeId
    ) {
      return;
    }

    setFeedback(null);

    setReminderCase(
      caseItem
    );
  }

  async function openCaseDetail(
    caseId
  ) {
    const requestVersion =
      detailRequestVersion.current +
      1;

    detailRequestVersion.current =
      requestVersion;

    setSelectedCase(null);
    setCaseHistory([]);

    setDetailLoading(
      true
    );

    setHistoryLoading(
      true
    );

    setDetailError("");
    setHistoryError("");

    const detailRequest =
      getCaseById(caseId)
        .then(
          (caseData) => {
            if (
              detailRequestVersion.current ===
              requestVersion
            ) {
              setSelectedCase(
                caseData
              );
            }
          }
        )
        .catch(
          (
            requestError
          ) => {
            if (
              detailRequestVersion.current ===
              requestVersion
            ) {
              setDetailError(
                getApiErrorMessage(
                  requestError,
                  "Không thể tải chi tiết hồ sơ."
                )
              );
            }
          }
        )
        .finally(() => {
          if (
            detailRequestVersion.current ===
            requestVersion
          ) {
            setDetailLoading(
              false
            );
          }
        });

    const historyRequest =
      getCaseHistory(
        caseId
      )
        .then(
          (
            historyData
          ) => {
            if (
              detailRequestVersion.current ===
              requestVersion
            ) {
              setCaseHistory(
                historyData ??
                  []
              );
            }
          }
        )
        .catch(() => {
          if (
            detailRequestVersion.current ===
            requestVersion
          ) {
            setHistoryError(
              "Không thể tải lịch sử xử lý"
            );
          }
        })
        .finally(() => {
          if (
            detailRequestVersion.current ===
            requestVersion
          ) {
            setHistoryLoading(
              false
            );
          }
        });

    await Promise.allSettled(
      [
        detailRequest,
        historyRequest,
      ]
    );
  }

  function closeCaseDetail() {
    detailRequestVersion.current +=
      1;

    setSelectedCase(null);
    setCaseHistory([]);

    setDetailError("");
    setHistoryError("");

    setDetailLoading(
      false
    );

    setHistoryLoading(
      false
    );
  }

  return (
    <section className="alerts-page">
      <div className="alerts-page__heading">
        <h1>
          Cảnh báo hồ sơ
        </h1>

        <p>
          Theo dõi hồ sơ
          sắp hạn, đến hạn
          và quá hạn xử lý.
        </p>
      </div>

      {feedback && (
        <div
          className={`cases-feedback cases-feedback--${feedback.type}`}
          role={
            feedback.type ===
            "error"
              ? "alert"
              : "status"
          }
        >
          <span>
            {
              feedback.message
            }
          </span>

          <button
            aria-label="Đóng thông báo"
            type="button"
            onClick={() =>
              setFeedback(
                null
              )
            }
          >
            <X
              size={14}
            />
          </button>
        </div>
      )}

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
              key={
                label
              }
            >
              <span>
                <strong>
                  {label}
                </strong>

                <b>
                  {value}
                </b>
              </span>

              <i
                aria-hidden="true"
              >
                <Icon
                  size={
                    20
                  }
                />
              </i>
            </article>
          )
        )}
      </div>

      <form
        className="cases-filter-card alerts-filter-card"
        onSubmit={
          applyFilters
        }
      >
        <label>
          <span>
            Tìm kiếm
          </span>

          <div className="cases-search-input">
            <Search
              size={15}
            />

            <input
              placeholder="Mã hoặc chủ hồ sơ"
              value={
                draftFilters.keyword
              }
              onChange={(
                event
              ) =>
                changeDraftFilter(
                  "keyword",
                  event.target
                    .value
                )
              }
            />
          </div>
        </label>

        <label>
          <span>
            Loại cảnh báo
          </span>

          <select
            value={
              draftFilters.alertType
            }
            onChange={(
              event
            ) =>
              changeDraftFilter(
                "alertType",
                event.target
                  .value
              )
            }
          >
            <option value="">
              Tất cả cảnh báo
            </option>

            {alertTypes.map(
              (
                alertType
              ) => (
                <option
                  key={
                    alertType.value
                  }
                  value={
                    alertType.value
                  }
                >
                  {
                    alertType.label
                  }
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span>
            Phòng ban
          </span>

          <input
            placeholder="Tên phòng ban"
            value={
              draftFilters.department
            }
            onChange={(
              event
            ) =>
              changeDraftFilter(
                "department",
                event.target
                  .value
              )
            }
          />
        </label>

        <label>
          <span>
            Người xử lý
          </span>

          <input
            placeholder="Tên cán bộ"
            value={
              draftFilters.assignee
            }
            onChange={(
              event
            ) =>
              changeDraftFilter(
                "assignee",
                event.target
                  .value
              )
            }
          />
        </label>

        <div className="cases-filter-card__actions">
          <button
            className="cases-button cases-button--primary"
            type="submit"
          >
            <Filter
              size={15}
            />

            Lọc
          </button>

          <button
            className="cases-button cases-button--secondary"
            type="button"
            onClick={
              resetFilters
            }
          >
            <RotateCcw
              size={15}
            />

            Đặt lại
          </button>
        </div>
      </form>

      <article className="cases-table-card alerts-table-card">
        <div className="cases-table-card__header">
          <h2>
            Danh sách cảnh báo
          </h2>

          <span>
            {
              pagination.totalItems
            }{" "}
            hồ sơ
          </span>
        </div>

        {loading && (
          <div className="cases-table__empty">
            Đang tải dữ liệu cảnh báo...
          </div>
        )}

        {!loading &&
          error && (
            <div
              className="cases-table__empty"
              role="alert"
            >
              {error}
            </div>
          )}

        {!loading &&
          !error && (
            <>
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
                      <th>Thời hạn</th>
                      <th>Mức cảnh báo</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {alertCases.map(
                      (
                        caseItem
                      ) => {
                        const rowCanSend =
                          canSendReminder &&
                          Boolean(
                            caseItem.assigneeId
                          );

                        return (
                          <tr
                            className={`alerts-row alerts-row--${getAlertKey(
                              caseItem.alertType
                            )} ${
                              rowCanSend
                                ? "alerts-row--clickable"
                                : ""
                            }`}
                            key={
                              caseItem.caseId
                            }
                            title={
                              rowCanSend
                                ? "Nhấn vào dòng để gửi nhắc nhở"
                                : !caseItem.assigneeId
                                  ? "Hồ sơ chưa có người xử lý"
                                  : undefined
                            }
                            onClick={() =>
                              openReminder(
                                caseItem
                              )
                            }
                          >
                            <td className="cases-table__code">
                              {caseItem.caseCode ??
                                "—"}
                            </td>

                            <td className="cases-table__name">
                              {caseItem.caseName ??
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
                                "Chưa phân công"}
                            </td>

                            <td>
                              {formatDate(
                                caseItem.dueAt
                              )}
                            </td>

                            <td>
                              {formatDate(
                                caseItem.appointmentDate
                              )}
                            </td>

                            <td>
                              <AlertCountdown
                                dueAt={
                                  caseItem.dueAt
                                }
                                currentTime={
                                  currentTime
                                }
                              />
                            </td>

                            <td>
                              <AlertBadge
                                alertType={
                                  caseItem.alertType
                                }
                                label={
                                  caseItem.alertLabel
                                }
                              />
                            </td>

                            <td>
                              <div className="cases-row-actions">
                                <button
                                  aria-label={`Xem ${caseItem.caseCode}`}
                                  className="cases-action-button"
                                  title="Chi tiết"
                                  type="button"
                                  onClick={(
                                    event
                                  ) => {
                                    event.stopPropagation();

                                    openCaseDetail(
                                      caseItem.caseId
                                    );
                                  }}
                                >
                                  <Eye
                                    size={
                                      14
                                    }
                                  />
                                </button>

                                {canSendReminder && (
                                  <button
                                    aria-label={`Gửi nhắc nhở ${caseItem.caseCode}`}
                                    className="cases-action-button alerts-remind-button"
                                    disabled={
                                      !caseItem.assigneeId
                                    }
                                    title={
                                      caseItem.assigneeId
                                        ? "Gửi nhắc nhở"
                                        : "Hồ sơ chưa có người xử lý"
                                    }
                                    type="button"
                                    onClick={(
                                      event
                                    ) => {
                                      event.stopPropagation();

                                      setFeedback(
                                        null
                                      );

                                      setReminderCase(
                                        caseItem
                                      );
                                    }}
                                  >
                                    <Send
                                      size={
                                        14
                                      }
                                    />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}

                    {!alertCases.length && (
                      <tr>
                        <td
                          className="cases-table__empty"
                          colSpan="10"
                        >
                          Không có hồ sơ cảnh báo phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="cases-pagination">
                <span>
                  Trang{" "}
                  {
                    pagination.page
                  }{" "}
                  /{" "}
                  {Math.max(
                    pagination.totalPages,
                    1
                  )}
                </span>

                <div>
                  <button
                    aria-label="Trang trước"
                    disabled={
                      !pagination.hasPrev
                    }
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (
                          page
                        ) =>
                          page -
                          1
                      )
                    }
                  >
                    <ChevronLeft
                      size={16}
                    />

                    Previous
                  </button>

                  <button
                    aria-label="Trang sau"
                    disabled={
                      !pagination.hasNext
                    }
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (
                          page
                        ) =>
                          page +
                          1
                      )
                    }
                  >
                    Next

                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
      </article>

      {(selectedCase ||
        detailLoading ||
        detailError) && (
        <CaseDetailModal
          caseItem={
            selectedCase
          }
          error={
            detailError
          }
          history={
            caseHistory
          }
          historyError={
            historyError
          }
          historyLoading={
            historyLoading
          }
          loading={
            detailLoading
          }
          onClose={
            closeCaseDetail
          }
        />
      )}

      {reminderCase && (
        <ReminderModal
          caseItem={
            reminderCase
          }
          onClose={() =>
            setReminderCase(
              null
            )
          }
          onSent={(
            caseItem,
            results
          ) => {
            const successful =
              Object.entries(
                results
              )
                .filter(
                  ([
                    ,
                    result,
                  ]) =>
                    result.success
                )
                .map(
                  ([
                    channel,
                  ]) =>
                    reminderChannelLabels[
                      channel
                    ] ??
                    channel
                );

            const failed =
              Object.entries(
                results
              )
                .filter(
                  ([
                    ,
                    result,
                  ]) =>
                    !result.success
                )
                .map(
                  ([
                    channel,
                    result,
                  ]) =>
                    `${
                      reminderChannelLabels[
                        channel
                      ] ??
                      channel
                    } (${
                      result.error
                    })`
                );

            setReminderCase(
              null
            );

            setFeedback({
              type:
                failed.length
                  ? "error"
                  : "success",

              message:
                failed.length
                  ? `Hồ sơ ${
                      caseItem.caseCode
                    }: đã gửi qua ${successful.join(
                      ", "
                    )}; không gửi được qua ${failed.join(
                      ", "
                    )}.`
                  : `Đã gửi nhắc nhở hồ sơ ${
                      caseItem.caseCode
                    } qua ${successful.join(
                      ", "
                    )} cho ${
                      caseItem.assigneeName
                    }.`,
            });
          }}
        />
      )}
    </section>
  );
}

export default AlertsPage;