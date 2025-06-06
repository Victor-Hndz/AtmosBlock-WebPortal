import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { AuthProvider } from "@/contexts/authProvider";
import { store } from "@/redux/store";
import "@/i18n/i18n";
import "./index.css";
import App from "./App";

// Render with a loading spinner while the app loads
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Provider>
  </React.StrictMode>
);
