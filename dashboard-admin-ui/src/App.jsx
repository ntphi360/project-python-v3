import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import {
  initializationFinished,
  sessionCleared,
  sessionRestored,
} from "./features/auth/authSlice";
import AppRoutes from "./routes/AppRoutes";
import { initializeSession } from "./services/authService";

function App() {
  const dispatch = useDispatch();
  const isInitializing = useSelector((state) => state.auth.isInitializing);

  useEffect(() => {
    let active = true;

    initializeSession()
      .then((session) => {
        if (active) dispatch(sessionRestored(session));
      })
      .catch(() => {
        if (active) dispatch(sessionCleared());
      })
      .finally(() => {
        if (active) dispatch(initializationFinished());
      });

    return () => {
      active = false;
    };
  }, [dispatch]);

  if (isInitializing) {
    return (
      <div className="auth-splash" role="status" aria-live="polite">
        <LoaderCircle className="auth-splash__spinner" size={28} />
        <span>Đang kiểm tra phiên đăng nhập...</span>
      </div>
    );
  }

  return <AppRoutes />;
}

export default App;
