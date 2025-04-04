import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { Navigate, useNavigate } from "react-router-dom";
import { Mail, User as UserIcon, ShieldCheck, Edit, Save, X, Trash2, AlertTriangle } from "lucide-react";
import * as Form from "@radix-ui/react-form";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Toast from "@radix-ui/react-toast";
import { updateUserProfile, deleteUserAccount, clearUserMessages } from "@/redux/slices/userSlice";
import { logoutUser } from "@/redux/slices/authSlice";

/**
 * User profile page component
 * Shows user information and profile options
 * @returns JSX for the profile page
 */
const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const { isLoading, error, successMessage } = useAppSelector(state => state.user);

  // Local state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");

  // Confirmation dialog for delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initialize form values when user data is available
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // Show toast for success/error messages
  useEffect(() => {
    if (successMessage) {
      setToastType("success");
      setToastMessage(successMessage);
      setToastOpen(true);

      // Clear messages after showing
      setTimeout(() => {
        dispatch(clearUserMessages());
      }, 3000);
    }
  }, [successMessage, dispatch]);

  useEffect(() => {
    if (error) {
      setToastType("error");
      setToastMessage(error);
      setToastOpen(true);

      // Clear messages after showing
      setTimeout(() => {
        dispatch(clearUserMessages());
      }, 3000);
    }
  }, [error, dispatch]);

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  /**
   * Handle form submission for profile updates
   * @param e Form event
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Only update if values changed
    const updates: { name?: string; email?: string } = {};
    if (name !== user.name) updates.name = name;
    if (email !== user.email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      dispatch(updateUserProfile(updates))
        .unwrap()
        .then(() => {
          setIsEditing(false);
        });
    } else {
      // No changes to save
      setIsEditing(false);
    }
  };

  /**
   * Cancel editing and reset form values
   */
  const handleCancel = () => {
    setName(user.name);
    setEmail(user.email);
    setIsEditing(false);
  };

  /**
   * Handle account deletion
   */
  const handleDeleteAccount = () => {
    dispatch(deleteUserAccount())
      .unwrap()
      .then(() => {
        dispatch(logoutUser());
        navigate("/");
      });
  };

  return (
    <Toast.Provider swipeDirection="right">
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t("profile.profile")}</h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              aria-label={t("profile.editProfile")}
            >
              <Edit size={16} />
              <span>{t("profile.edit")}</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("profile.userInformation")}</h2>

          {isEditing ? (
            <Form.Root className="space-y-4" onSubmit={handleSubmit}>
              <Form.Field name="name" className="space-y-2">
                <Form.Label className="block text-sm font-medium text-gray-700">{t("profile.name")}</Form.Label>
                <Form.Control asChild>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Form.Control>
                <Form.Message match="valueMissing" className="text-sm text-red-600">
                  {t("profile.nameRequired")}
                </Form.Message>
              </Form.Field>

              <Form.Field name="email" className="space-y-2">
                <Form.Label className="block text-sm font-medium text-gray-700">{t("profile.email")}</Form.Label>
                <Form.Control asChild>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Form.Control>
                <Form.Message match="valueMissing" className="text-sm text-red-600">
                  {t("profile.emailRequired")}
                </Form.Message>
                <Form.Message match="typeMismatch" className="text-sm text-red-600">
                  {t("profile.emailInvalid")}
                </Form.Message>
              </Form.Field>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  <X size={16} />
                  <span>{t("buttons.cancel")}</span>
                </button>
                <Form.Submit asChild>
                  <button
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <Save size={16} />
                    <span>{isLoading ? t("buttons.saving") : t("buttons.save")}</span>
                  </button>
                </Form.Submit>
              </div>
            </Form.Root>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start">
                <UserIcon className="mt-1 mr-3 text-gray-500" size={20} />
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
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t("profile.accountOptions")}</h2>

          <button
            onClick={() => navigate("/settings")}
            className="w-full mb-3 px-4 py-2 border border-gray-300 rounded-md text-left hover:bg-gray-50 transition-colors flex items-center"
          >
            <span className="flex-1">{t("profile.viewRequests")}</span>
            <span className="text-gray-400">→</span>
          </button>

          <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialog.Trigger asChild>
              <button className="w-full px-4 py-2 border border-red-300 rounded-md text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                <Trash2 size={16} />
                <span>{t("profile.deleteAccount")}</span>
              </button>
            </AlertDialog.Trigger>

            <AlertDialog.Portal>
              <AlertDialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-fade-in" />
              <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white rounded-lg p-6 shadow-lg data-[state=open]:animate-slide-up">
                <AlertDialog.Title className="text-xl font-semibold text-red-600 mb-2 flex items-center gap-2">
                  <AlertTriangle />
                  {t("profile.deleteConfirmTitle")}
                </AlertDialog.Title>
                <AlertDialog.Description className="text-gray-700 mb-5">
                  {t("profile.deleteConfirmMessage")}
                </AlertDialog.Description>

                <div className="flex justify-end gap-3">
                  <AlertDialog.Cancel asChild>
                    <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                      {t("buttons.cancel")}
                    </button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {isLoading ? t("buttons.deleting") : t("buttons.delete")}
                    </button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      </div>

      {/* Toast notifications */}
      <Toast.Root
        className={`fixed bottom-4 right-4 p-4 rounded-md shadow-md max-w-sm ${
          toastType === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
        } data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut`}
        open={toastOpen}
        onOpenChange={setToastOpen}
      >
        <Toast.Title className={`font-medium ${toastType === "success" ? "text-green-800" : "text-red-800"}`}>
          {toastType === "success" ? t("toast.success") : t("toast.error")}
        </Toast.Title>
        <Toast.Description className={toastType === "success" ? "text-green-700" : "text-red-700"}>
          {toastMessage}
        </Toast.Description>
        <Toast.Close className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">×</Toast.Close>
      </Toast.Root>
      <Toast.Viewport />
    </Toast.Provider>
  );
};

export default ProfilePage;
