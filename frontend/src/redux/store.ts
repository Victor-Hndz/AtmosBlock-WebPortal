import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import requestsReducer from "./slices/requestsSlice";
import languageReducer from "./slices/languageSlice";
import userReducer from "./slices/userSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    requests: requestsReducer,
    language: languageReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
