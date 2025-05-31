import { JSX, useEffect, Suspense, lazy } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/layout";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { clearRequestHash } from "@/redux/slices/submitRequestsSlice";

// Use lazy loading for route components to improve initial load performance
const Home = lazy(() => import("@/pages/homePage"));
const About = lazy(() => import("@/pages/aboutPage"));
const NotFound = lazy(() => import("@/pages/notFoundPage"));
const AuthPage = lazy(() => import("@/pages/authPage"));
const RequestsPage = lazy(() => import("@/pages/requestsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ResultsPage = lazy(() => import("@/pages/ResultsPage"));

// Simple loading spinner component
const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center h-screen text-violet-500">
    <div className="w-12 h-12 border-4 border-violet-400 rounded-full border-t-transparent animate-spin mb-4"></div>
    <p className="text-sm">Cargando aplicación...</p>
  </div>
);

/**
 * Component to handle redirect to results page after submission
 */
function RequestSubmissionHandler() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const requestHash = useAppSelector(state => state.submitRequests.requestHash);

  useEffect(() => {
    if (requestHash) {
      navigate(`/results?requestHash=${requestHash}`);
      dispatch(clearRequestHash());
    }
  }, [requestHash, navigate, dispatch]);

  return null;
}

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
        {
          path: "",
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Home />
            </Suspense>
          ),
        },
        {
          path: "about",
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <About />
            </Suspense>
          ),
        },
        {
          path: "requests",
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <>
                <RequestsPage />
                <RequestSubmissionHandler />
              </>
            </Suspense>
          ),
        },
        {
          path: "results",
          element: (
            <ProtectedRoute>
              <Suspense fallback={<LoadingFallback />}>
                <ResultsPage />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: "auth",
          element: isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Suspense fallback={<LoadingFallback />}>
              <AuthPage />
            </Suspense>
          ),
        },
        {
          path: "profile",
          element: (
            <ProtectedRoute>
              <Suspense fallback={<LoadingFallback />}>
                <ProfilePage />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: "/previous-requests",
          element: (
            <ProtectedRoute>
              <Suspense fallback={<LoadingFallback />}>
                <SettingsPage />
              </Suspense>
            </ProtectedRoute>
          ),
        },
      ],
    },
    {
      path: "*",
      element: (
        <Suspense fallback={<LoadingFallback />}>
          <NotFound />
        </Suspense>
      ),
    },
  ]);

  return <RouterProvider router={router} />;
}

export default AppRoutes;
