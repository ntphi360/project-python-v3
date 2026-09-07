import { configureStore } from "@reduxjs/toolkit";
import authReducer, {
  accessTokenReceived,
  sessionCleared,
} from "../features/auth/authSlice";
import { configureApiAuth } from "../services/api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

configureApiAuth({
  accessTokenSelector: () => store.getState().auth.accessToken,
  onAccessToken: (accessToken) => {
    store.dispatch(accessTokenReceived(accessToken));
  },
  onAuthenticationFailure: () => {
    store.dispatch(sessionCleared());
  },
});
