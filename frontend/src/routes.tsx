import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "@/pages/homePage";
import About from "@/pages/aboutPage";
import NotFound from "@/pages/notFoundPage";
import Layout from "@/components/layout/layout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "", element: <Home /> },
      { path: "about", element: <About /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
