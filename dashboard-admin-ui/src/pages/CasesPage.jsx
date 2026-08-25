import { useEffect, useState } from "react";
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
  getCases,
  updateCase,
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

function toDateTimeLocal(value) {
  return value ? value.slice(0, 16) : "";
}

function getApiErrorMessage(error, fallbackMessage) {
  const payload = error?.response?.data;
  if (!payload?.message) return fallbackMessage;

  const details = payload.errors && typeof payload.errors === "object"
    ? Object.values(payload.errors).filter((value) => typeof value === "string")
    : [];

  return details.length
    ? `${payload.message}: ${details.join(" ")}`
    : payload.message;
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
    caseCode: form.caseCode.trim(),
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

function CaseModal({ children, onClose, title }) {
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
  const isEditing = Boolean(initialCase);

  function updateForm(name, value) {
    setFormError("");
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.caseCode.trim()) {
      setFormError("Mã hồ sơ không được để trống.");
      return;
    }

    const idFields = ["procedureId", "departmentId", "assigneeId"];
    const invalidId = idFields.find((field) => (
      form[field] !== ""
      && (!Number.isInteger(Number(form[field])) || Number(form[field]) <= 0)
    ));

    if (invalidId) {
      setFormError("ID thủ tục, phòng ban và người xử lý phải là số nguyên dương.");
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
          <label><span>Mã hồ sơ <em>*</em></span><input autoFocus required value={form.caseCode} onChange={(event) => updateForm("caseCode", event.target.value)} /></label>
          <label><span>Chủ hồ sơ</span><input value={form.applicantName} onChange={(event) => updateForm("applicantName", event.target.value)} /></label>
          <label><span>Số điện thoại</span><input value={form.applicantPhone} onChange={(event) => updateForm("applicantPhone", event.target.value)} /></label>
          <label><span>Đơn vị</span><input value={form.agencyName} onChange={(event) => updateForm("agencyName", event.target.value)} /></label>
          <label><span>Procedure ID</span><input min="1" step="1" type="number" value={form.procedureId} onChange={(event) => updateForm("procedureId", event.target.value)} /></label>
          <label><span>Department ID</span><input min="1" step="1" type="number" value={form.departmentId} onChange={(event) => updateForm("departmentId", event.target.value)} /></label>
          <label><span>Assignee ID</span><input min="1" step="1" type="number" value={form.assigneeId} onChange={(event) => updateForm("assigneeId", event.target.value)} /></label>
          <label><span>Trạng thái</span><select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>{caseStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label><span>Ngày tiếp nhận</span><input type="datetime-local" value={form.receivedAt} onChange={(event) => updateForm("receivedAt", event.target.value)} /></label>
          <label><span>Ngày hẹn trả</span><input type="datetime-local" value={form.appointmentDate} onChange={(event) => updateForm("appointmentDate", event.target.value)} /></label>
          <label><span>Hạn xử lý</span><input type="datetime-local" value={form.dueAt} onChange={(event) => updateForm("dueAt", event.target.value)} /></label>
          <label><span>Ưu tiên</span><input value={form.priority} onChange={(event) => updateForm("priority", event.target.value)} /></label>
          <label><span>Bước hiện tại</span><input value={form.currentStepName} onChange={(event) => updateForm("currentStepName", event.target.value)} /></label>
          <label><span>Nguồn dữ liệu</span><input value={form.sourceType} onChange={(event) => updateForm("sourceType", event.target.value)} /></label>
          {formError && <p className="case-form-error case-form-grid__wide" role="alert">{formError}</p>}
        </div>
        <footer className="case-modal__footer">
          <button className="cases-button cases-button--secondary" disabled={submitting} type="button" onClick={onClose}>Hủy</button>
          <button className="cases-button cases-button--primary" disabled={submitting} type="submit">
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

function CaseDetailModal({ caseItem, error, loading, onClose }) {
  return (
    <CaseModal onClose={onClose} title="Chi tiết hồ sơ">
      <div className="case-modal__body">
        {loading && <div className="cases-table__empty">Đang tải chi tiết hồ sơ...</div>}
        {!loading && error && <div className="cases-table__empty">{error}</div>}
        {!loading && !error && caseItem && (
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
    try {
      setSelectedCase(null);
      setDetailLoading(true);
      setDetailError("");
      setSelectedCase(await getCaseById(caseId));
    } catch (requestError) {
      setDetailError(getApiErrorMessage(requestError, "Không thể tải chi tiết hồ sơ."));
    } finally {
      setDetailLoading(false);
    }
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
    await createCase(payload);
    setIsAdding(false);
    setFeedback({ type: "success", message: "Tạo hồ sơ thành công." });
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

      {(selectedCase || detailLoading || detailError) && <CaseDetailModal caseItem={selectedCase} error={detailError} loading={detailLoading} onClose={() => { setSelectedCase(null); setDetailError(""); setDetailLoading(false); }} />}
      {isAdding && <CaseFormModal onClose={() => setIsAdding(false)} onSubmit={handleCreate} />}
      {editingCase && <CaseFormModal initialCase={editingCase} onClose={() => setEditingCase(null)} onSubmit={handleUpdate} />}
      {deletingCase && <DeleteCaseModal caseItem={deletingCase} deleting={deleting} error={deleteError} onClose={() => { setDeletingCase(null); setDeleteError(""); }} onConfirm={handleDelete} />}
    </section>
  );
}

export default CasesPage;
