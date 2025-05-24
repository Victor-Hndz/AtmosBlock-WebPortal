import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { AuthProvider } from "@/contexts/authProvider";
import { store } from "@/redux/store";
import "@/i18n/i18n";
import "./index.css";
import App from "./App";


// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-violet-500">
    <div className="w-12 h-12 border-4 border-violet-400 rounded-full border-t-transparent animate-spin mb-4"></div>
    <p className="text-sm">Cargando aplicación...</p>
  </div>
);


// Render with a loading spinner while the app loads
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <App />
        </Suspense>
      </AuthProvider>
    </Provider>
  </React.StrictMode>
);
