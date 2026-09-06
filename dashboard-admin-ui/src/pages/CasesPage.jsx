import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createCase,
  deleteCase,
  getCaseById,
  getCaseHistory,
  getCases,
  updateCase,
} from "../services/caseService";
import {
  getAgencies,
  getDepartments,
  getProcedures,
  getUsers,
} from "../services/catalogService";
import { getApiErrorMessage } from "../utils/apiError";
import "./CasesPage.css";

const PAGE_SIZE = 10;

const caseHistoryActionLabels = {
  CASE_CREATED: "Tạo hồ sơ",
  STATUS_CHANGED: "Thay đổi trạng thái",
  ASSIGNEE_CHANGED: "Thay đổi người xử lý",
  STEP_CHANGED: "Thay đổi bước xử lý",
};

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

const emptyCaseForm = {
  caseCode: "",
  procedureId: "",
  departmentId: "",
  assigneeId: "",
  applicantName: "",
  applicantPhone: "",
  agencyName: "",
  receivedAt: "",
  appointmentDate: "",
  dueAt: "",
  status: "Đang xử lý",
  priority: "Bình thường",
  currentStepName: "",
  sourceType: "MANUAL",
};

const emptyPagination = {
  page: 1,
  perPage: PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const [date, time = ""] = value.split("T");
  return `${formatDate(date)}${time ? ` ${time.slice(0, 5)}` : ""}`;
}

function getCaseHistoryLabel(action) {
  return caseHistoryActionLabels[action] ?? action ?? "Cập nhật hồ sơ";
}

function getCaseHistoryDescription(historyItem) {
  const label = getCaseHistoryLabel(historyItem.action);

  if (historyItem.action === "CASE_CREATED") {
    if (historyItem.note && historyItem.note !== label) {
      return historyItem.note;
    }

    return historyItem.newValue
      ? `Hồ sơ ${historyItem.newValue} được tạo`
      : "";
  }

  const oldValue = historyItem.oldValue ?? "";
  const newValue = historyItem.newValue ?? (
    historyItem.action === "ASSIGNEE_CHANGED"
      ? "Chưa phân công"
      : "Chưa có"
  );

  if (oldValue || historyItem.newValue !== null) {
    return `${oldValue} → ${newValue}`.trim();
  }

  return historyItem.note ?? "";
}

function toDateTimeLocal(value) {
  return value ? value.slice(0, 16) : "";
}

function getCaseFormValues(caseItem) {
  if (!caseItem) return { ...emptyCaseForm };

  return {
    caseCode: caseItem.caseCode ?? "",
    procedureId: caseItem.procedureId ?? "",
    departmentId: caseItem.departmentId ?? "",
    assigneeId: caseItem.assigneeId ?? "",
    applicantName: caseItem.applicantName ?? "",
    applicantPhone: caseItem.applicantPhone ?? "",
    agencyName: caseItem.agencyName ?? "",
    receivedAt: toDateTimeLocal(caseItem.receivedAt),
    appointmentDate: toDateTimeLocal(caseItem.appointmentDate),
    dueAt: toDateTimeLocal(caseItem.dueAt),
    status: caseItem.status ?? "Đang xử lý",
    priority: caseItem.priority ?? "Bình thường",
    currentStepName: caseItem.currentStepName ?? "",
    sourceType: caseItem.sourceType ?? "MANUAL",
  };
}

function optionalId(value) {
  return value === "" ? null : Number(value);
}

function buildCasePayload(form) {
  return {
    procedureId: optionalId(form.procedureId),
    departmentId: optionalId(form.departmentId),
    assigneeId: optionalId(form.assigneeId),
    applicantName: form.applicantName.trim(),
    applicantPhone: form.applicantPhone.trim(),
    agencyName: form.agencyName.trim(),
    receivedAt: form.receivedAt || null,
    appointmentDate: form.appointmentDate || null,
    dueAt: form.dueAt || null,
    status: form.status,
    priority: form.priority.trim(),
    currentStepName: form.currentStepName.trim(),
    sourceType: form.sourceType.trim(),
  };
}

function StatusBadge({ status }) {
  const statusKeys = {
    "Mới tiếp nhận": "new",
    "Đang xử lý": "processing",
    "Sắp hạn": "upcoming",
    "Quá hạn": "overdue",
    "Hoàn thành": "completed",
    "Đã hoàn thành": "completed",
  };

  return (
    <span className={`cases-status-badge cases-status-badge--${statusKeys[status] ?? "default"}`}>
      {status || "—"}
    </span>
  );
}

export function CaseModal({ children, onClose, title }) {
  return (
    <div className="case-modal" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="case-modal-title"
        aria-modal="true"
        className="case-modal__dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="case-modal__header">
          <h2 id="case-modal-title">{title}</h2>
          <button aria-label="Đóng" className="case-icon-button" disabled={!onClose} type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function CaseFormModal({ initialCase, onClose, onSubmit }) {
  const [form, setForm] = useState(() => getCaseFormValues(initialCase));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [procedures, setProcedures] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [users, setUsers] = useState([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [catalogsError, setCatalogsError] = useState("");
  const [usersError, setUsersError] = useState("");
  const isEditing = Boolean(initialCase);
  const selectedProcedure = procedures.find(
    (procedure) => String(procedure.id) === String(form.procedureId),
  );
  const currentAssigneeIsOutsideDepartment = (
    isEditing
    && form.assigneeId
    && !usersLoading
    && !users.some((user) => String(user.id) === String(form.assigneeId))
  );
  const currentAgencyIsMissing = (
    isEditing
    && form.agencyName
    && !agencies.includes(form.agencyName)
  );
  const catalogsReady = (
    !catalogsLoading
    && !catalogsError
    && procedures.length > 0
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogs() {
      try {
        setCatalogsLoading(true);
        setCatalogsError("");
        const [procedureData, departmentData, agencyData] = await Promise.all([
          getProcedures(),
          getDepartments(),
          getAgencies(),
        ]);

        if (!cancelled) {
          setProcedures(procedureData ?? []);
          setDepartments(departmentData ?? []);
          setAgencies((agencyData ?? []).map((agency) => agency.name));
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogsError(getApiErrorMessage(
            error,
            "Không thể tải danh mục thủ tục và phòng ban.",
          ));
        }
      } finally {
        if (!cancelled) setCatalogsLoading(false);
      }
    }

    loadCatalogs();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!form.departmentId) {
      return () => { cancelled = true; };
    }

    async function loadUsers() {
      try {
        setUsersLoading(true);
        setUsersError("");
        const userData = await getUsers(Number(form.departmentId));

        if (!cancelled) {
          setUsers(userData ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setUsers([]);
          setUsersError(getApiErrorMessage(
            error,
            "Không thể tải danh sách cán bộ xử lý.",
          ));
        }
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }

    loadUsers();
    return () => { cancelled = true; };
  }, [form.departmentId]);

  function updateForm(name, value) {
    setFormError("");
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateDepartment(departmentId) {
    setFormError("");
    setUsersError("");
    setUsers([]);
    setForm((current) => ({
      ...current,
      departmentId,
      assigneeId: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.procedureId) {
      setFormError("Vui lòng chọn thủ tục hành chính.");
      return;
    }

    if (!catalogsReady || usersLoading || catalogsError || usersError) {
      setFormError("Vui lòng chờ dữ liệu danh mục tải hoàn tất.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      await onSubmit(buildCasePayload(form));
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        isEditing ? "Không thể cập nhật hồ sơ." : "Không thể tạo hồ sơ.",
      ));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CaseModal onClose={submitting ? undefined : onClose} title={isEditing ? "Chỉnh sửa hồ sơ" : "Thêm hồ sơ"}>
      <form onSubmit={handleSubmit}>
        <div className="case-modal__body case-form-grid">
          <label>
            <span>Mã hồ sơ</span>
            <input
              placeholder={isEditing ? "" : "Tự động tạo khi lưu"}
              readOnly
              value={isEditing ? form.caseCode : ""}
            />
          </label>
          <label><span>Chủ hồ sơ</span><input autoFocus value={form.applicantName} onChange={(event) => updateForm("applicantName", event.target.value)} /></label>
          <label><span>Số điện thoại</span><input value={form.applicantPhone} onChange={(event) => updateForm("applicantPhone", event.target.value)} /></label>
          <label>
            <span>Đơn vị</span>
            <select
              disabled={catalogsLoading || submitting || Boolean(catalogsError)}
              value={form.agencyName}
              onChange={(event) => updateForm("agencyName", event.target.value)}
            >
              <option value="">
                {catalogsLoading ? "Đang tải đơn vị..." : "Chọn đơn vị"}
              </option>
              {currentAgencyIsMissing && (
                <option value={form.agencyName}>{form.agencyName}</option>
              )}
              {agencies.map((agencyName) => (
                <option key={agencyName} value={agencyName}>
                  {agencyName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Thủ tục <em>*</em></span>
            <select
              disabled={catalogsLoading || submitting || Boolean(catalogsError)}
              required
              value={form.procedureId}
              onChange={(event) => updateForm("procedureId", event.target.value)}
            >
              <option value="">
                {catalogsLoading
                  ? "Đang tải thủ tục..."
                  : procedures.length
                    ? "Chọn thủ tục"
                    : "Không có dữ liệu thủ tục"}
              </option>
              {procedures.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>
                  {procedure.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Lĩnh vực</span>
            <input
              placeholder="Chưa xác định"
              readOnly
              value={selectedProcedure?.fieldName ?? ""}
            />
          </label>
          <label>
            <span>Phòng ban</span>
            <select
              disabled={catalogsLoading || submitting || Boolean(catalogsError)}
              value={form.departmentId}
              onChange={(event) => updateDepartment(event.target.value)}
            >
              <option value="">
                {catalogsLoading ? "Đang tải phòng ban..." : "Chọn phòng ban"}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Cán bộ xử lý</span>
            <select
              disabled={!form.departmentId || usersLoading || submitting || Boolean(usersError)}
              value={form.assigneeId}
              onChange={(event) => updateForm("assigneeId", event.target.value)}
            >
              <option value="">
                {!form.departmentId
                  ? "Chọn phòng ban trước"
                  : usersLoading
                    ? "Đang tải cán bộ..."
                    : users.length
                      ? "Chọn cán bộ xử lý"
                      : "Không có cán bộ phù hợp"}
              </option>
              {currentAssigneeIsOutsideDepartment && (
                <option value={form.assigneeId}>
                  {initialCase.assigneeName || "Cán bộ hiện tại"}
                </option>
              )}
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </label>
          <label><span>Trạng thái</span><select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>{caseStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label><span>Ngày tiếp nhận</span><input type="datetime-local" value={form.receivedAt} onChange={(event) => updateForm("receivedAt", event.target.value)} /></label>
          <label><span>Ngày hẹn trả</span><input type="datetime-local" value={form.appointmentDate} onChange={(event) => updateForm("appointmentDate", event.target.value)} /></label>
          <label><span>Hạn xử lý</span><input type="datetime-local" value={form.dueAt} onChange={(event) => updateForm("dueAt", event.target.value)} /></label>
          <label><span>Ưu tiên</span><input value={form.priority} onChange={(event) => updateForm("priority", event.target.value)} /></label>
          <label><span>Bước hiện tại</span><input value={form.currentStepName} onChange={(event) => updateForm("currentStepName", event.target.value)} /></label>
          <label><span>Nguồn dữ liệu</span><input value={form.sourceType} onChange={(event) => updateForm("sourceType", event.target.value)} /></label>
          {catalogsError && <p className="case-form-error case-form-grid__wide" role="alert">{catalogsError}</p>}
          {usersError && <p className="case-form-error case-form-grid__wide" role="alert">{usersError}</p>}
          {formError && <p className="case-form-error case-form-grid__wide" role="alert">{formError}</p>}
        </div>
        <footer className="case-modal__footer">
          <button className="cases-button cases-button--secondary" disabled={submitting} type="button" onClick={onClose}>Hủy</button>
          <button className="cases-button cases-button--primary" disabled={submitting || !catalogsReady || usersLoading || Boolean(usersError)} type="submit">
            {submitting && <LoaderCircle className="cases-spinner" size={14} />}
            {submitting ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo hồ sơ"}
          </button>
        </footer>
      </form>
    </CaseModal>
  );
}

function DeleteCaseModal({ caseItem, deleting, error, onClose, onConfirm }) {
  return (
    <CaseModal onClose={deleting ? undefined : onClose} title="Xóa hồ sơ">
      <div className="case-modal__body case-delete-confirm">
        <span className="case-delete-confirm__icon" aria-hidden="true"><Trash2 size={21} /></span>
        <div>
          <p>Bạn có chắc chắn muốn xóa hồ sơ này?</p>
          <dl>
            <div><dt>Mã hồ sơ</dt><dd>{caseItem.caseCode ?? "—"}</dd></div>
            <div><dt>Chủ hồ sơ</dt><dd>{caseItem.applicantName ?? "—"}</dd></div>
          </dl>
          <small>Hồ sơ chỉ biến mất sau khi backend xác nhận xóa thành công.</small>
          {error && <p className="case-form-error" role="alert">{error}</p>}
        </div>
      </div>
      <footer className="case-modal__footer">
        <button className="cases-button cases-button--secondary" disabled={deleting} type="button" onClick={onClose}>Hủy</button>
        <button className="cases-button cases-button--danger" disabled={deleting} type="button" onClick={onConfirm}>
          {deleting && <LoaderCircle className="cases-spinner" size={14} />}
          {deleting ? "Đang xóa..." : "Xác nhận xóa"}
        </button>
      </footer>
    </CaseModal>
  );
}

export function CaseDetailModal({
  caseItem,
  error,
  history,
  historyError,
  historyLoading,
  loading,
  onClose,
}) {
  return (
    <CaseModal onClose={onClose} title="Chi tiết hồ sơ">
      <div className="case-modal__body">
        {loading && <div className="cases-table__empty">Đang tải chi tiết hồ sơ...</div>}
        {!loading && error && <div className="cases-table__empty">{error}</div>}
        {!loading && !error && caseItem && (
          <>
            <dl className="case-details">
              <div className="case-details__item"><dt>Mã hồ sơ</dt><dd>{caseItem.caseCode ?? "—"}</dd></div>
              <div className="case-details__item"><dt>Chủ hồ sơ</dt><dd>{caseItem.applicantName ?? "—"}</dd></div>
              <div className="case-details__item"><dt>Số điện thoại</dt><dd>{caseItem.applicantPhone ?? "—"}</dd></div>
              <div className="case-details__item"><dt>Đơn vị</dt><dd>{caseItem.agencyName ?? "—"}</dd></div>
              <div className="case-details__item case-details__item--wide"><dt>Thủ tục hành chính</dt><dd>{caseItem.procedureName ?? "—"}</dd></div>
              <div className="case-details__item"><dt>Phòng ban</dt><dd>{caseItem.departmentName ?? "—"}</dd></div>
              <div className="case-details__item"><dt>Người xử lý</dt><dd>{caseItem.assigneeName ?? "—"}</dd></div>
              <div className="case-details__item"><dt>Ngày tiếp nhận</dt><dd>{formatDateTime(caseItem.receivedAt)}</dd></div>
              <div className="case-details__item case-details__item--appointment"><dt>Ngày hẹn trả</dt><dd>{formatDateTime(caseItem.appointmentDate)}</dd></div>
              <div className="case-details__item"><dt>Hạn xử lý</dt><dd>{formatDateTime(caseItem.dueAt)}</dd></div>
              <div className="case-details__item"><dt>Ngày hoàn thành</dt><dd>{formatDateTime(caseItem.completedAt)}</dd></div>
              <div className="case-details__item"><dt>Trạng thái</dt><dd><StatusBadge status={caseItem.status} /></dd></div>
              <div className="case-details__item"><dt>Ưu tiên</dt><dd>{caseItem.priority ?? "—"}</dd></div>
              <div className="case-details__item"><dt>Bước hiện tại</dt><dd>{caseItem.currentStepName ?? "—"}</dd></div>
              <div className="case-details__item"><dt>Nguồn dữ liệu</dt><dd>{caseItem.sourceType ?? "—"}</dd></div>
            </dl>

            <section className="case-history">
              <h3>LỊCH SỬ XỬ LÝ</h3>
              {historyLoading && (
                <p className="case-history__state">Đang tải lịch sử xử lý...</p>
              )}
              {!historyLoading && historyError && (
                <p className="case-history__state case-history__state--error" role="status">
                  {historyError}
                </p>
              )}
              {!historyLoading && !historyError && !history.length && (
                <p className="case-history__state">Chưa có lịch sử xử lý</p>
              )}
              {!historyLoading && !historyError && history.length > 0 && (
                <ol>
                  {history.map((historyItem) => {
                    const description = getCaseHistoryDescription(historyItem);

                    return (
                      <li key={historyItem.id}>
                        <span className="case-history__dot" aria-hidden="true" />
                        <div>
                          <time dateTime={historyItem.createdAt}>
                            {formatDateTime(historyItem.createdAt)}
                          </time>
                          <strong>{getCaseHistoryLabel(historyItem.action)}</strong>
                          {description && <small>{description}</small>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </CaseModal>
  );
}

function CasesPage() {
  const [caseList, setCaseList] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCase, setSelectedCase] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [caseHistory, setCaseHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const detailRequestVersion = useRef(0);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [deletingCase, setDeletingCase] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCases() {
      try {
        setLoading(true);
        setError("");
        const data = await getCases(currentPage, PAGE_SIZE, appliedFilters);

        if (!cancelled) {
          setCaseList(data?.items ?? []);
          setPagination(data?.pagination ?? { ...emptyPagination, page: currentPage });
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, "Không thể tải danh sách hồ sơ."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCases();
    return () => { cancelled = true; };
  }, [appliedFilters, currentPage, reloadVersion]);

  async function openCaseDetail(caseId) {
    const requestVersion = detailRequestVersion.current + 1;
    detailRequestVersion.current = requestVersion;
    setSelectedCase(null);
    setCaseHistory([]);
    setDetailLoading(true);
    setHistoryLoading(true);
    setDetailError("");
    setHistoryError("");

    const detailRequest = getCaseById(caseId)
      .then((caseData) => {
        if (detailRequestVersion.current === requestVersion) {
          setSelectedCase(caseData);
        }
      })
      .catch((requestError) => {
        if (detailRequestVersion.current === requestVersion) {
          setDetailError(getApiErrorMessage(
            requestError,
            "Không thể tải chi tiết hồ sơ.",
          ));
        }
      })
      .finally(() => {
        if (detailRequestVersion.current === requestVersion) {
          setDetailLoading(false);
        }
      });

    const historyRequest = getCaseHistory(caseId)
      .then((historyData) => {
        if (detailRequestVersion.current === requestVersion) {
          setCaseHistory(historyData ?? []);
        }
      })
      .catch(() => {
        if (detailRequestVersion.current === requestVersion) {
          setHistoryError("Không thể tải lịch sử xử lý");
        }
      })
      .finally(() => {
        if (detailRequestVersion.current === requestVersion) {
          setHistoryLoading(false);
        }
      });

    await Promise.allSettled([detailRequest, historyRequest]);
  }

  async function openEditCase(caseId) {
    try {
      setEditLoadingId(caseId);
      setFeedback(null);
      setEditingCase(await getCaseById(caseId));
    } catch (requestError) {
      setFeedback({ type: "error", message: getApiErrorMessage(requestError, "Không thể tải hồ sơ để chỉnh sửa.") });
    } finally {
      setEditLoadingId(null);
    }
  }

  async function handleCreate(payload) {
    const createdCase = await createCase(payload);
    setIsAdding(false);
    setFeedback({
      type: "success",
      message: `Tạo hồ sơ ${createdCase.caseCode} thành công.`,
    });
    setReloadVersion((version) => version + 1);
  }

  async function handleUpdate(payload) {
    await updateCase(editingCase.id, payload);
    setEditingCase(null);
    setFeedback({ type: "success", message: "Cập nhật hồ sơ thành công." });
    setReloadVersion((version) => version + 1);
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      setDeleteError("");
      await deleteCase(deletingCase.id);
      setDeletingCase(null);
      setFeedback({ type: "success", message: "Xóa hồ sơ thành công." });

      if (caseList.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        setReloadVersion((version) => version + 1);
      }
    } catch (requestError) {
      setDeleteError(getApiErrorMessage(requestError, "Không thể xóa hồ sơ."));
    } finally {
      setDeleting(false);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters({ ...draftFilters });
    setCurrentPage(1);
  }

  function resetFilters() {
    setDraftFilters({ ...emptyFilters });
    setAppliedFilters({ ...emptyFilters });
    setCurrentPage(1);
  }

  return (
    <section className="cases-page">
      <div className="cases-page__heading">
        <div><h1>Quản lý hồ sơ</h1><p>Theo dõi, tra cứu và quản lý hồ sơ hành chính.</p></div>
        <button className="cases-button cases-button--primary" type="button" onClick={() => { setFeedback(null); setIsAdding(true); }}><Plus size={15} /> Thêm hồ sơ</button>
      </div>

      {feedback && (
        <div className={`cases-feedback cases-feedback--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
          <span>{feedback.message}</span>
          <button aria-label="Đóng thông báo" type="button" onClick={() => setFeedback(null)}><X size={14} /></button>
        </div>
      )}

      <form className="cases-filter-card" onSubmit={applyFilters}>
        <label className="cases-filter-card__search"><span>Tìm kiếm</span><div className="cases-search-input"><Search size={15} aria-hidden="true" /><input placeholder="Mã hồ sơ, chủ hồ sơ, thủ tục..." value={draftFilters.search} onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} /></div></label>
        <label><span>Trạng thái</span><select value={draftFilters.status} onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Tất cả trạng thái</option>{caseStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label><span>Phòng ban</span><input placeholder="Tên phòng ban..." value={draftFilters.department} onChange={(event) => setDraftFilters((current) => ({ ...current, department: event.target.value }))} /></label>
        <label><span>Người xử lý</span><input placeholder="Tên cán bộ..." value={draftFilters.assignee} onChange={(event) => setDraftFilters((current) => ({ ...current, assignee: event.target.value }))} /></label>
        <label><span>Từ ngày tiếp nhận</span><input type="date" value={draftFilters.fromDate} onChange={(event) => setDraftFilters((current) => ({ ...current, fromDate: event.target.value }))} /></label>
        <label><span>Đến ngày tiếp nhận</span><input min={draftFilters.fromDate || undefined} type="date" value={draftFilters.toDate} onChange={(event) => setDraftFilters((current) => ({ ...current, toDate: event.target.value }))} /></label>
        <div className="cases-filter-card__actions"><button className="cases-button cases-button--primary" type="submit"><Filter size={15} /> Lọc</button><button className="cases-button cases-button--secondary" type="button" onClick={resetFilters}><RotateCcw size={15} /> Đặt lại</button></div>
      </form>

      <article className="cases-table-card">
        <div className="cases-table-card__header"><h2>Danh sách hồ sơ</h2><span>{pagination.total} hồ sơ</span></div>
        {loading && <div className="cases-table__empty">Đang tải dữ liệu...</div>}
        {!loading && error && <div className="cases-table__empty">{error}</div>}
        {!loading && !error && (
          <>
            <div className="cases-table-wrap">
              <table className="cases-table">
                <thead><tr><th>Mã hồ sơ</th><th>Chủ hồ sơ</th><th>Thủ tục hành chính</th><th>Phòng ban</th><th>Người xử lý</th><th>Ngày tiếp nhận</th><th>Ngày hẹn trả</th><th>Hạn xử lý</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                <tbody>
                  {caseList.map((caseItem) => (
                    <tr className="cases-table__row" key={caseItem.id} onClick={() => openCaseDetail(caseItem.id)}>
                      <td className="cases-table__code">{caseItem.caseCode ?? "—"}</td>
                      <td className="cases-table__name">{caseItem.applicantName ?? "—"}</td>
                      <td>{caseItem.procedureName ?? "—"}</td><td>{caseItem.departmentName ?? "—"}</td><td>{caseItem.assigneeName ?? "—"}</td>
                      <td>{formatDate(caseItem.receivedAt)}</td><td>{formatDateTime(caseItem.appointmentDate)}</td><td>{formatDateTime(caseItem.dueAt)}</td>
                      <td><StatusBadge status={caseItem.status} /></td>
                      <td>
                        <div className="cases-row-actions">
                          <button aria-label={`Xem ${caseItem.caseCode}`} className="cases-action-button" title="Chi tiết" type="button" onClick={(event) => { event.stopPropagation(); openCaseDetail(caseItem.id); }}><Eye size={14} /></button>
                          <button aria-label={`Sửa ${caseItem.caseCode}`} className="cases-action-button" disabled={editLoadingId === caseItem.id} title="Chỉnh sửa" type="button" onClick={(event) => { event.stopPropagation(); openEditCase(caseItem.id); }}>{editLoadingId === caseItem.id ? <LoaderCircle className="cases-spinner" size={14} /> : <Pencil size={14} />}</button>
                          <button aria-label={`Xóa ${caseItem.caseCode}`} className="cases-action-button cases-action-button--danger" title="Xóa" type="button" onClick={(event) => { event.stopPropagation(); setDeleteError(""); setDeletingCase(caseItem); }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!caseList.length && <tr><td className="cases-table__empty" colSpan="10">Chưa có dữ liệu hồ sơ.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="cases-pagination"><span>Trang {pagination.page} / {pagination.totalPages}</span><div><button aria-label="Trang trước" disabled={!pagination.hasPrev} type="button" onClick={() => setCurrentPage((page) => page - 1)}><ChevronLeft size={16} /> Previous</button><button aria-label="Trang sau" disabled={!pagination.hasNext} type="button" onClick={() => setCurrentPage((page) => page + 1)}>Next <ChevronRight size={16} /></button></div></div>
          </>
        )}
      </article>

      {(selectedCase || detailLoading || detailError) && (
        <CaseDetailModal
          caseItem={selectedCase}
          error={detailError}
          history={caseHistory}
          historyError={historyError}
          historyLoading={historyLoading}
          loading={detailLoading}
          onClose={() => {
            detailRequestVersion.current += 1;
            setSelectedCase(null);
            setCaseHistory([]);
            setDetailError("");
            setHistoryError("");
            setDetailLoading(false);
            setHistoryLoading(false);
          }}
        />
      )}
      {isAdding && <CaseFormModal onClose={() => setIsAdding(false)} onSubmit={handleCreate} />}
      {editingCase && <CaseFormModal initialCase={editingCase} onClose={() => setEditingCase(null)} onSubmit={handleUpdate} />}
      {deletingCase && <DeleteCaseModal caseItem={deletingCase} deleting={deleting} error={deleteError} onClose={() => { setDeletingCase(null); setDeleteError(""); }} onConfirm={handleDelete} />}
    </section>
  );
}

export default CasesPage;
