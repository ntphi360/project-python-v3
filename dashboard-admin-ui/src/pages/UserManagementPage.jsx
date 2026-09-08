import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  KeyRound,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Unlock,
  X,
} from "lucide-react";
import { useSelector } from "react-redux";

import { USER_ROLES } from "../constants/roles";
import { getDepartments } from "../services/catalogService";
import {
  changeUserRole,
  changeUserStatus,
  createUser,
  getUsers,
  resetUserPassword,
  updateUser,
} from "../services/userService";
import { getApiErrorMessage } from "../utils/apiError";
import { CaseModal } from "./CasesPage";
import "./CasesPage.css";
import "./UserManagementPage.css";

const PAGE_SIZE = 10;
const roles = Object.values(USER_ROLES);
const emptyFilters = {
  keyword: "",
  role: "",
  departmentId: "",
  isActive: "",
};
const emptyPagination = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

function getInitialForm(user) {
  return {
    username: user?.username ?? "",
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phoneNumber: user?.phoneNumber ?? "",
    departmentId: user?.departmentId ?? "",
    role: user ? (user.role ?? "") : USER_ROLES.OFFICER,
    password: "",
    confirmPassword: "",
  };
}

function UserFormModal({ currentUserId, departments, initialUser, onClose, onSaved }) {
  const [form, setForm] = useState(() => getInitialForm(initialUser));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const isEditing = Boolean(initialUser);
  const isCurrentUser = initialUser?.id === currentUserId;

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!form.username.trim() || !form.fullName.trim() || !form.email.trim()) {
      setError("Username, họ tên và email là bắt buộc.");
      return;
    }
    if (!isEditing && !form.role) {
      setError("Vui lòng chọn role.");
      return;
    }
    if (!isEditing && form.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (!isEditing && form.password !== form.confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    const profile = {
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || null,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
    };

    try {
      if (isEditing) {
        await updateUser(initialUser.id, profile);
        if (!isCurrentUser && form.role && form.role !== initialUser.role) {
          await changeUserRole(initialUser.id, form.role);
        }
      } else {
        await createUser({ ...profile, role: form.role, password: form.password });
      }
      onSaved(isEditing ? "Cập nhật người dùng thành công" : "Tạo người dùng thành công");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể lưu người dùng."));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <CaseModal onClose={submitting ? undefined : onClose} title={isEditing ? "Chỉnh sửa người dùng" : "Thêm người dùng"}>
      <form onSubmit={handleSubmit}>
        <div className="case-modal__body user-form-grid">
          <label><span>Username *</span><input disabled={submitting} value={form.username} onChange={(event) => updateField("username", event.target.value)} /></label>
          <label><span>Họ và tên *</span><input disabled={submitting} value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} /></label>
          <label><span>Email *</span><input disabled={submitting} type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label>
          <label><span>Số điện thoại</span><input disabled={submitting} value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} /></label>
          <label><span>Phòng ban</span><select disabled={submitting} value={form.departmentId} onChange={(event) => updateField("departmentId", event.target.value)}><option value="">Không chọn</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
          <label><span>Role *</span><select disabled={submitting || isCurrentUser} value={form.role} onChange={(event) => updateField("role", event.target.value)}>{isEditing && !form.role && <option value="">Chưa gán</option>}{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
          {!isEditing && (
            <>
              <label><span>Mật khẩu *</span><input disabled={submitting} minLength="8" type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} /></label>
              <label><span>Xác nhận mật khẩu *</span><input disabled={submitting} minLength="8" type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} /></label>
            </>
          )}
          {error && <p className="user-form-error" role="alert">{error}</p>}
        </div>
        <footer className="case-modal__footer">
          <button className="cases-button cases-button--secondary" disabled={submitting} type="button" onClick={onClose}>Hủy</button>
          <button className="cases-button cases-button--primary" disabled={submitting} type="submit">{submitting && <LoaderCircle className="cases-spinner" size={14} />}{submitting ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo người dùng"}</button>
        </footer>
      </form>
    </CaseModal>
  );
}

function ResetPasswordModal({ onClose, onReset, user }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (newPassword.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      await resetUserPassword(user.id, { newPassword, confirmPassword });
      onReset();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể đặt lại mật khẩu."));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <CaseModal onClose={submitting ? undefined : onClose} title="Đặt lại mật khẩu">
      <form onSubmit={handleSubmit}>
        <div className="case-modal__body user-password-form">
          <p>Người dùng: <strong>{user.fullName || user.username}</strong></p>
          <label><span>Mật khẩu mới</span><input disabled={submitting} minLength="8" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label><span>Xác nhận mật khẩu</span><input disabled={submitting} minLength="8" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          {error && <p className="user-form-error" role="alert">{error}</p>}
        </div>
        <footer className="case-modal__footer"><button className="cases-button cases-button--secondary" disabled={submitting} type="button" onClick={onClose}>Hủy</button><button className="cases-button cases-button--primary" disabled={submitting} type="submit">{submitting && <LoaderCircle className="cases-spinner" size={14} />}Đặt lại mật khẩu</button></footer>
      </form>
    </CaseModal>
  );
}

function UserManagementPage() {
  const currentUserId = useSelector((state) => state.auth.user?.id);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [formUser, setFormUser] = useState(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [actionUserId, setActionUserId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getDepartments()
      .then((data) => { if (!cancelled) setDepartments(data ?? []); })
      .catch(() => { if (!cancelled) setDepartments([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      try {
        setLoading(true);
        setError("");
        const data = await getUsers(currentPage, PAGE_SIZE, appliedFilters);
        if (!cancelled) {
          setUsers(data?.items ?? []);
          setPagination(data?.pagination ?? { ...emptyPagination, page: currentPage });
        }
      } catch (requestError) {
        if (!cancelled) setError(getApiErrorMessage(requestError, "Không thể tải danh sách người dùng."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUsers();
    return () => { cancelled = true; };
  }, [appliedFilters, currentPage, reloadVersion]);

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

  function finishMutation(message) {
    setFormOpen(false);
    setFormUser(undefined);
    setResetUser(null);
    setFeedback({ type: "success", message });
    setReloadVersion((value) => value + 1);
  }

  async function toggleStatus(user) {
    if (user.id === currentUserId || actionUserId) return;
    if (!window.confirm(`${user.isActive ? "Khóa" : "Mở khóa"} tài khoản ${user.username}?`)) return;
    setActionUserId(user.id);
    setFeedback(null);
    try {
      await changeUserStatus(user.id, !user.isActive);
      finishMutation(user.isActive ? "Khóa tài khoản thành công" : "Mở khóa tài khoản thành công");
    } catch (requestError) {
      setFeedback({ type: "error", message: getApiErrorMessage(requestError, "Không thể thay đổi trạng thái người dùng.") });
    } finally {
      setActionUserId(null);
    }
  }

  return (
    <section className="users-page">
      <div className="users-page__heading"><div><h1>Quản lý người dùng</h1><p>Quản lý tài khoản, vai trò và trạng thái truy cập hệ thống.</p></div><button className="cases-button cases-button--primary" type="button" onClick={() => { setFormUser(undefined); setFormOpen(true); setFeedback(null); }}><Plus size={15} /> Thêm người dùng</button></div>
      {feedback && <div className={`cases-feedback cases-feedback--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}><span>{feedback.message}</span><button aria-label="Đóng thông báo" type="button" onClick={() => setFeedback(null)}><X size={14} /></button></div>}
      <form className="cases-filter-card users-filter-card" onSubmit={applyFilters}>
        <label className="cases-filter-card__search"><span>Tìm kiếm</span><div className="cases-search-input"><Search size={15} /><input placeholder="Username, email hoặc họ tên" value={draftFilters.keyword} onChange={(event) => setDraftFilters((current) => ({ ...current, keyword: event.target.value }))} /></div></label>
        <label><span>Role</span><select value={draftFilters.role} onChange={(event) => setDraftFilters((current) => ({ ...current, role: event.target.value }))}><option value="">Tất cả</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
        <label><span>Phòng ban</span><select value={draftFilters.departmentId} onChange={(event) => setDraftFilters((current) => ({ ...current, departmentId: event.target.value }))}><option value="">Tất cả</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
        <label><span>Trạng thái</span><select value={draftFilters.isActive} onChange={(event) => setDraftFilters((current) => ({ ...current, isActive: event.target.value }))}><option value="">Tất cả</option><option value="true">Hoạt động</option><option value="false">Đã khóa</option></select></label>
        <div className="cases-filter-card__actions"><button className="cases-button cases-button--primary" type="submit"><Filter size={15} /> Lọc</button><button className="cases-button cases-button--secondary" type="button" onClick={resetFilters}><RotateCcw size={15} /> Đặt lại</button></div>
      </form>
      <article className="cases-table-card users-table-card">
        <div className="cases-table-card__header"><h2>Danh sách người dùng</h2><span>{pagination.totalItems} người dùng</span></div>
        {loading && <div className="cases-table__empty">Đang tải danh sách người dùng...</div>}
        {!loading && error && <div className="cases-table__empty" role="alert">{error}</div>}
        {!loading && !error && <div className="cases-table-wrap"><table className="cases-table users-table"><thead><tr><th>Username</th><th>Họ tên</th><th>Email</th><th>Số điện thoại</th><th>Phòng ban</th><th>Role</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td className="cases-table__code">{user.username}</td><td className="cases-table__name">{user.fullName || "—"}</td><td>{user.email || "—"}</td><td>{user.phoneNumber || "—"}</td><td>{user.departmentName || "—"}</td><td><span className={`user-role-badge user-role-badge--${(user.role || "none").toLowerCase()}`}>{user.role || "Chưa gán"}</span></td><td><span className={`user-status-badge user-status-badge--${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Hoạt động" : "Đã khóa"}</span></td><td><div className="cases-row-actions"><button aria-label={`Sửa ${user.username}`} className="cases-action-button" title="Chỉnh sửa" type="button" onClick={() => { setFormUser(user); setFormOpen(true); setFeedback(null); }}><Pencil size={14} /></button><button aria-label={`Đặt lại mật khẩu ${user.username}`} className="cases-action-button" title="Đặt lại mật khẩu" type="button" onClick={() => { setResetUser(user); setFeedback(null); }}><KeyRound size={14} /></button><button aria-label={`${user.isActive ? "Khóa" : "Mở khóa"} ${user.username}`} className="cases-action-button" disabled={user.id === currentUserId || actionUserId === user.id} title={user.id === currentUserId ? "Không thể tự khóa tài khoản" : user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"} type="button" onClick={() => toggleStatus(user)}>{actionUserId === user.id ? <LoaderCircle className="cases-spinner" size={14} /> : user.isActive ? <Lock size={14} /> : <Unlock size={14} />}</button></div></td></tr>)}{!users.length && <tr><td className="cases-table__empty" colSpan="8">Không có người dùng phù hợp.</td></tr>}</tbody></table></div>}
        {!loading && !error && <div className="cases-pagination"><span>Trang {pagination.page} / {Math.max(pagination.totalPages, 1)}</span><div><button aria-label="Trang trước" disabled={!pagination.hasPrev} type="button" onClick={() => setCurrentPage((page) => page - 1)}><ChevronLeft size={16} /> Previous</button><button aria-label="Trang sau" disabled={!pagination.hasNext} type="button" onClick={() => setCurrentPage((page) => page + 1)}>Next <ChevronRight size={16} /></button></div></div>}
      </article>
      {formOpen && <UserFormModal currentUserId={currentUserId} departments={departments} initialUser={formUser} onClose={() => setFormOpen(false)} onSaved={finishMutation} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onReset={() => finishMutation("Đặt lại mật khẩu thành công")} />}
    </section>
  );
}

export default UserManagementPage;
