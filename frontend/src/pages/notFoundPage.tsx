import React from "react";
import { useNavigate } from "react-router-dom";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Separator from "@radix-ui/react-separator";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

/**
 * NotFoundPage component - Displays when a user attempts to access a non-existent route
 *
 * @returns {React.ReactElement} A styled 404 page with options to navigate back
 */
const NotFoundPage: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();

  /**
   * Handles navigation back to the previous page
   */
  const handleGoBack = (): void => {
    navigate(-1);
  };

  /**
   * Handles navigation to the home page
   */
  const handleGoHome = (): void => {
    navigate("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <AlertDialog.Root defaultOpen>
          <AlertDialog.Content className="p-6">
            <div className="flex items-center justify-center mb-4 text-red-500">
              <AlertTriangle className="w-12 h-12" />
            </div>

            <AlertDialog.Title className="text-2xl font-bold text-center text-gray-900 mb-2">
              404 - Page Not Found
            </AlertDialog.Title>

            <Separator.Root className="h-px bg-gray-200 my-4" />

            <AlertDialog.Description className="text-gray-600 text-center mb-6">
              The page you're looking for doesn't exist or has been moved.
            </AlertDialog.Description>

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleGoBack}
                className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                aria-label="Go back to previous page"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </button>

              <button
                onClick={handleGoHome}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Go to home page"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
    </div>
  );
};

export default NotFoundPage;
