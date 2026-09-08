import { useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { changePassword } from "../services/authService";
import { getApiErrorMessage } from "../utils/apiError";
import { CaseModal } from "../pages/CasesPage";
import "../pages/CasesPage.css";
import "./ChangePasswordModal.css";

function ChangePasswordModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!form.currentPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      await changePassword(form);
      onSuccess();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể đổi mật khẩu."));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <CaseModal onClose={submitting ? undefined : onClose} title="Đổi mật khẩu">
      <form onSubmit={handleSubmit}>
        <div className="case-modal__body change-password-form">
          <label><span>Mật khẩu hiện tại</span><input autoComplete="current-password" disabled={submitting} type="password" value={form.currentPassword} onChange={(event) => updateField("currentPassword", event.target.value)} /></label>
          <label><span>Mật khẩu mới</span><input autoComplete="new-password" disabled={submitting} minLength="8" type="password" value={form.newPassword} onChange={(event) => updateField("newPassword", event.target.value)} /></label>
          <label><span>Xác nhận mật khẩu mới</span><input autoComplete="new-password" disabled={submitting} minLength="8" type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} /></label>
          {error && <p className="change-password-form__error" role="alert">{error}</p>}
        </div>
        <footer className="case-modal__footer">
          <button className="cases-button cases-button--secondary" disabled={submitting} type="button" onClick={onClose}>Hủy</button>
          <button className="cases-button cases-button--primary" disabled={submitting} type="submit">{submitting && <LoaderCircle className="cases-spinner" size={14} />}{submitting ? "Đang đổi..." : "Đổi mật khẩu"}</button>
        </footer>
      </form>
    </CaseModal>
  );
}

export default ChangePasswordModal;
