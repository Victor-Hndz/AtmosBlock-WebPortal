import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import * as Separator from "@radix-ui/react-separator";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { User, LogOut, LayoutList } from "lucide-react";
import { useAppDispatch } from "@/redux/hooks";
import { logoutUser } from "@/redux/slices/authSlice";
import { User as UserType } from "@/types/User";

/**
 * Props for UserProfileMenu component
 */
interface UserProfileMenuProps {
  /** Current authenticated user */
  user: UserType;
}

/**
 * User profile menu component that displays user information and authentication options
 * @param props - Component properties
 * @returns A dropdown menu component for user profile actions
 */
const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ user }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  /**
   * Handles user logout action
   */
  const handleLogout = () => {
    dispatch(logoutUser())
      .unwrap()
      .then(() => {
        navigate("/");
      })
      .catch(error => {
        console.error("Logout failed:", error);
      });
  };

  /**
   * Navigates to profile page
   */
  const goToProfile = () => {
    navigate("/profile");
  };

  /**
   * Navigates to settings page
   */
  const goToPreviousRequests = () => {
    navigate("/previous-requests");
  };

  /**
   * Gets initials from user's name for the avatar
   * @returns First letter of first and last name when available
   */
  const getInitials = (): string => {
    if (!user.name) return "?";

    const nameParts = user.name.trim().split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

    return nameParts[0].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].charAt(0).toUpperCase();
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="rounded-full h-8 w-8 flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          aria-label={t("profile.userMenu")}
        >
          <Avatar.Root className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden">
            <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-sm font-medium">
              {getInitials()}
            </Avatar.Fallback>
          </Avatar.Root>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[220px] bg-white rounded-md shadow-lg p-2 border border-gray-200 z-50"
          sideOffset={5}
          align="end"
        >
          <div className="px-3 py-2">
            <p className="font-medium text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          <Separator.Root className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Item
            className="flex items-center rounded-md px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            onSelect={goToProfile}
          >
            <User className="mr-2 h-4 w-4" />
            {t("profile.viewProfile")}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex items-center rounded-md px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            onSelect={goToPreviousRequests}
          >
            <LayoutList className="mr-2 h-4 w-4" />
            {t("profile.settings")}
          </DropdownMenu.Item>

          <Separator.Root className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Item
            className="flex items-center rounded-md px-3 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50 focus:outline-none focus:bg-red-50"
            onSelect={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("profile.logout")}
          </DropdownMenu.Item>

          <DropdownMenu.Arrow className="fill-white" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default UserProfileMenu;
