import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import submitRequestsReducer from "./slices/submitRequestsSlice";
import viewRequestsReducer from "./slices/viewRequestsSlice";
import languageReducer from "./slices/languageSlice";
import userReducer from "./slices/userSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    submitRequests: submitRequestsReducer,
    viewRequests: viewRequestsReducer,
    language: languageReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
