import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/layout";
import AuthPage from "@/pages/authPage";
import HomePage from "@/pages/homePage";
import AboutPage from "@/pages/aboutPage";
import RequestsPage from "@/pages/requestsPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import { useAppSelector } from "@/redux/hooks";

/**
 * Protected route component that redirects to login if user is not authenticated
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppSelector(state => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

/**
 * Route configuration for the application
 * @returns The routes component
 */
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAppSelector(state => state.auth);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="auth" element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />} />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
