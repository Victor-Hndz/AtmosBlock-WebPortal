import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "@/pages/homePage";
import About from "@/pages/aboutPage";
import NotFound from "@/pages/notFoundPage";
import Layout from "@/components/layout/layout";
import AuthPage from "@/pages/authPage";
import { JSX } from "react";
import RequestsPage from "./pages/requestsPage";

/**
 * Application router configuration
 * Defines all available routes and their respective components
 */
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "", element: <Home /> },
      { path: "about", element: <About /> },
      { path: "auth", element: <AuthPage /> },
      { path: "requests", element: <RequestsPage /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

/**
 * Provides routing functionality for the application
 * @returns {JSX.Element} RouterProvider component with configured routes
 */
export function AppRoutes(): JSX.Element {
  return <RouterProvider router={router} />;
}
