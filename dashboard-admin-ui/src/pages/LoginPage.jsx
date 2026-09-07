import { useEffect, useState } from "react";
import { FileText, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import {
  authErrorCleared,
  loginFailed,
  loginStarted,
  loginSucceeded,
} from "../features/auth/authSlice";
import { login } from "../services/authService";
import { getApiErrorMessage } from "../utils/apiError";
import "./LoginPage.css";

function LoginPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { error, loginLoading } = useSelector((state) => state.auth);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => () => {
    dispatch(authErrorCleared());
  }, [dispatch]);

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier || !password) {
      setValidationError("Vui lòng nhập đầy đủ email/username và mật khẩu.");
      return;
    }

    setValidationError("");
    dispatch(loginStarted());

    try {
      const credentials = normalizedIdentifier.includes("@")
        ? { email: normalizedIdentifier, password }
        : { username: normalizedIdentifier, password };
      const session = await login(credentials);
      dispatch(loginSucceeded(session));

      const previousLocation = location.state?.from;
      const destination = previousLocation
        ? `${previousLocation.pathname}${previousLocation.search ?? ""}${previousLocation.hash ?? ""}`
        : "/";
      navigate(destination, { replace: true });
    } catch (requestError) {
      dispatch(loginFailed(getApiErrorMessage(
        requestError,
        "Không thể đăng nhập. Vui lòng thử lại.",
      )));
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__brand" aria-hidden="true">
          <div className="login-card__logo">
            <FileText size={27} strokeWidth={2.1} />
            <ShieldCheck size={14} strokeWidth={2.6} />
          </div>
          <span>HỆ THỐNG QUẢN LÝ HỒ SƠ</span>
        </div>

        <div className="login-card__heading">
          <h1 id="login-title">Đăng nhập</h1>
          <p>Nhập thông tin tài khoản để tiếp tục.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="login-identifier">Email hoặc username</label>
          <input
            autoComplete="username"
            autoFocus
            disabled={loginLoading}
            id="login-identifier"
            name="identifier"
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Nhập email hoặc username"
            type="text"
            value={identifier}
          />

          <label htmlFor="login-password">Mật khẩu</label>
          <div className="login-form__password">
            <LockKeyhole size={17} aria-hidden="true" />
            <input
              autoComplete="current-password"
              disabled={loginLoading}
              id="login-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              type="password"
              value={password}
            />
          </div>

          {(validationError || error) && (
            <div className="login-form__error" role="alert">
              {validationError || error}
            </div>
          )}

          <button className="login-form__submit" disabled={loginLoading} type="submit">
            {loginLoading && <LoaderCircle className="login-form__spinner" size={18} />}
            {loginLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
