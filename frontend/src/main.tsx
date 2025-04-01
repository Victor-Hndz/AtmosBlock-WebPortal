import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "@/contexts/authProvider";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import App from "./App";
import "./index.css";
// Import i18n instance
import "@/i18n/i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Provider>
  </React.StrictMode>
);
