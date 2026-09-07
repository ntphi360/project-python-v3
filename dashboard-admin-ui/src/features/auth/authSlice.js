import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  loginLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStarted: (state) => {
      state.loginLoading = true;
      state.error = null;
    },
    loginSucceeded: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.loginLoading = false;
      state.error = null;
    },
    loginFailed: (state, action) => {
      state.loginLoading = false;
      state.error = action.payload;
    },
    sessionRestored: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
    },
    accessTokenReceived: (state, action) => {
      state.accessToken = action.payload;
    },
    initializationFinished: (state) => {
      state.isInitializing = false;
    },
    sessionCleared: (state) => {
      state.accessToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.isInitializing = false;
      state.loginLoading = false;
      state.error = null;
    },
    authErrorCleared: (state) => {
      state.error = null;
    },
  },
});

export const {
  accessTokenReceived,
  authErrorCleared,
  initializationFinished,
  loginFailed,
  loginStarted,
  loginSucceeded,
  sessionCleared,
  sessionRestored,
} = authSlice.actions;

export default authSlice.reducer;
