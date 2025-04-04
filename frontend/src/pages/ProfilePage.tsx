import React from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/hooks";
import { Navigate } from "react-router-dom";
import { Mail, User, ShieldCheck } from "lucide-react";

/**
 * User profile page component
 * Shows user information and profile options
 * @returns JSX for the profile page
 */
const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAppSelector(state => state.auth);

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("profile.profile")}</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("profile.userInformation")}</h2>

        <div className="space-y-4">
          <div className="flex items-start">
            <User className="mt-1 mr-3 text-gray-500" size={20} />
            <div>
              <p className="text-sm text-gray-500">{t("profile.name")}</p>
              <p className="font-medium">{user.name}</p>
            </div>
          </div>

          <div className="flex items-start">
            <Mail className="mt-1 mr-3 text-gray-500" size={20} />
            <div>
              <p className="text-sm text-gray-500">{t("profile.email")}</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>

          {user.role && (
            <div className="flex items-start">
              <ShieldCheck className="mt-1 mr-3 text-gray-500" size={20} />
              <div>
                <p className="text-sm text-gray-500">{t("profile.role")}</p>
                <p className="font-medium">{user.role}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{t("profile.accountOptions")}</h2>

        <button className="w-full mb-3 px-4 py-2 border border-gray-300 rounded-md text-left hover:bg-gray-50 transition-colors">
          {t("profile.editProfile")}
        </button>

        <button className="w-full mb-3 px-4 py-2 border border-gray-300 rounded-md text-left hover:bg-gray-50 transition-colors">
          {t("profile.changePassword")}
        </button>

        <button className="w-full px-4 py-2 border border-red-300 rounded-md text-left text-red-600 hover:bg-red-50 transition-colors">
          {t("profile.deleteAccount")}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
