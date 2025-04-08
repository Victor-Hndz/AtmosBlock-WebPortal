import { JSX } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import Home from "@/pages/homePage";
import About from "@/pages/aboutPage";
import NotFound from "@/pages/notFoundPage";
import AuthPage from "@/pages/authPage";
import RequestsPage from "@/pages/requestsPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import Layout from "@/components/layout/layout";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { useAppSelector } from "@/redux/hooks";

/**
 * Application router configuration
 * Defines all available routes and their respective components
 */
function AppRoutes(): JSX.Element {
  const { isAuthenticated } = useAppSelector(state => state.auth);

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      children: [
        { path: "", element: <Home /> },
        { path: "about", element: <About /> },
        { path: "requests", element: <RequestsPage /> },
        { path: "auth", element: isAuthenticated ? <Navigate to="/" replace /> : <AuthPage /> },
        {
          path: "profile",
          element: (
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          ),
        },
        {
          path: "settings",
          element: (
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          ),
        },
      ],
    },
    { path: "*", element: <NotFound /> },
  ]);

  return <RouterProvider router={router} />;
}

export default AppRoutes;
