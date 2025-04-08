import React, { JSX } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { House, LogIn, Info, Menu, ListTodo, LucideProps } from "lucide-react";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import * as Separator from "@radix-ui/react-separator";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import UserProfileMenu from "@/components/shared/UserProfileMenu";
import { useAppSelector } from "@/redux/hooks";
import "./layout.css";

/**
 * Type for Lucide icon components
 */
type LucideIconType = React.ComponentType<LucideProps>;

/**
 * Navigation item structure for the main menu
 */
interface NavItem {
  /** Path to navigate to */
  path: string;
  /** Translation key for label */
  labelKey:
    | "app.title"
    | "app.description"
    | "navigation-header.home"
    | "navigation-header.requests"
    | "navigation-header.login"
    | "navigation-footer.about"
    | "language.switchLanguage";
  /** Icon component to display */
  icon: LucideIconType;
  /** Translation key for tooltip */
  tooltipKey?:
    | "navigation-tooltips.home"
    | "navigation-tooltips.requests"
    | "navigation-tooltips.login"
    | "navigation-tooltips.about";
  /** Position of the item in the menu (left/right/center) */
  position?: "l" | "r" | "c";
  /** Whether the item should collapse into mobile menu on smaller screens */
  collapse?: boolean;
}

/**
 * NavLink component displaying a navigation item with tooltip
 * @param {Object} props - Component properties
 * @param {NavItem} props.item - Navigation item data
 * @param {boolean} props.isActive - Whether the link is currently active
 */
const NavLink: React.FC<{ item: NavItem; isActive: boolean }> = ({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) => {
  const Icon = item.icon;
  const { t } = useTranslation();

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <NavigationMenu.Item>
            <NavigationMenu.Link
              asChild
              active={isActive}
              className="nav-link text-white font-medium relative transition-all duration-300 hover:text-blue-300 px-2 py-1 flex items-center"
            >
              <Link to={item.path}>
                <Icon aria-hidden="true" size={16} className="inline-block align-middle mr-1" />
                <span>{t(item.labelKey)}</span>
              </Link>
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        </Tooltip.Trigger>
        {item.tooltipKey && (
          <Tooltip.Portal>
            <Tooltip.Content
              className="tooltip-content bg-gray-900 text-white px-4 py-2 rounded-md text-sm z-50 shadow-md"
              sideOffset={5}
            >
              {t(item.tooltipKey)}
              <Tooltip.Arrow className="tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Portal>
        )}
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

/**
 * MobileMenuItem component for displaying navigation items in mobile menu
 * @param {Object} props - Component properties
 * @param {NavItem} props.item - Navigation item data
 */
const MobileMenuItem: React.FC<{ item: NavItem }> = ({ item }: { item: NavItem }) => {
  const Icon = item.icon;
  const { t } = useTranslation();

  return (
    <DropdownMenu.Item asChild>
      <Link
        to={item.path}
        className="flex items-center p-2 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
      >
        <Icon aria-hidden="true" size={16} className="inline-block mr-1" />
        <span>{t(item.labelKey)}</span>
      </Link>
    </DropdownMenu.Item>
  );
};

/**
 * Main layout component that provides consistent structure across pages
 * @returns {JSX.Element} The layout component with navigation, main content, and footer
 */
const Layout: React.FC = (): JSX.Element => {
  const location = useLocation();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAppSelector(state => state.auth);

  // Navigation items configuration with translation keys
  const navItems: NavItem[] = [
    {
      path: "/",
      labelKey: "navigation-header.home",
      icon: House,
      tooltipKey: "navigation-tooltips.home",
      position: "l",
      collapse: true,
    },
    {
      path: "/requests",
      labelKey: "navigation-header.requests",
      icon: ListTodo,
      tooltipKey: "navigation-tooltips.requests",
      position: "l",
      collapse: true,
    },
  ];

  if (!isAuthenticated) {
    navItems.push({
      path: "/auth",
      labelKey: "navigation-header.login",
      icon: LogIn,
      tooltipKey: "navigation-tooltips.login",
      position: "r",
      collapse: true,
    });
  }

  // Group navigation items by position and collapsibility
  const leftNavItems = navItems.filter(item => item.position === "l");
  const centerNavItems = navItems.filter(item => item.position === "c");
  const rightNavItems = navItems.filter(item => item.position === "r");

  // Items that should be included in the mobile menu
  const collapsibleItems = navItems.filter(item => item.collapse !== false);

  // Items that should always be visible (non-collapsible)
  const alwaysVisibleItems = navItems.filter(item => item.collapse === false);

  // Check if we have any collapsible items for mobile menu
  const hasCollapsibleItems = collapsibleItems.length > 0;

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Navbar using Radix UI NavigationMenu */}
      <NavigationMenu.Root className="fixed top-0 left-0 right-0 bg-gray-800 text-white p-4 z-50 shadow-md">
        <NavigationMenu.List className="w-full max-w-[1024px] mx-auto">
          {/* Desktop Navigation and Non-collapsible Items */}
          <div className="flex w-full justify-between items-center">
            {/* Left aligned items */}
            <div className="hidden md:flex gap-4">
              {leftNavItems.map(item => (
                <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
              ))}
            </div>

            {/* Center aligned items */}
            <div className="hidden md:flex gap-4">
              {centerNavItems.map(item => (
                <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
              ))}
            </div>

            {/* Right aligned items with language switcher and user profile */}
            <div className="hidden md:flex gap-4 items-center">
              {rightNavItems.map(item => (
                <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
              ))}

              {/* Show user profile menu if authenticated */}
              {isAuthenticated && user && <UserProfileMenu user={user} />}

              <LanguageSwitcher />
            </div>

            {/* Always visible items (even on mobile) */}
            <div className="md:hidden flex gap-4">
              {alwaysVisibleItems.map(item => (
                <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
              ))}
            </div>

            {/* Mobile Navigation */}
            {hasCollapsibleItems && (
              <div className="md:hidden flex flex-1 justify-between items-center">
                {/* Hamburger menu */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className="p-2 rounded-md transition-colors duration-200 hover:bg-gray-700"
                      aria-label={t("language.switchLanguage")}
                    >
                      <Menu aria-hidden="true" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="bg-gray-800 rounded-md shadow-lg p-2 min-w-[150px] origin-top-left z-50"
                      sideOffset={5}
                      align="start"
                    >
                      {collapsibleItems.map(item => (
                        <MobileMenuItem key={item.path} item={item} />
                      ))}

                      <DropdownMenu.Arrow className="fill-gray-800" />
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                {/* User profile in mobile view when authenticated */}
                {isAuthenticated && user ? <UserProfileMenu user={user} /> : <LanguageSwitcher />}
              </div>
            )}
          </div>
        </NavigationMenu.List>
      </NavigationMenu.Root>

      {/* Main content with padding to avoid overlap with fixed elements */}
      <main className="flex-1 mt-16 mb-20 p-4 mx-auto w-full max-w-[1024px] transition-all duration-300" role="main">
        <Outlet /> {/* Render the content of each route */}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 shadow-md" role="contentinfo">
        <div className="flex justify-center items-center gap-2 flex-wrap">
          <p className="transition-opacity duration-300 hover:opacity-80">&copy; 2025 FAST-IBAN Project</p>
          <Separator.Root className="h-4 w-px bg-gray-500 mx-2" decorative orientation="vertical" />
          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Link
                  to="/about"
                  className="text-blue-400 font-medium relative inline-flex items-center transition-all duration-300 hover:text-blue-200"
                >
                  <Info className="inline-block mr-1" size={16} aria-hidden="true" />
                  <span>{t("navigation-footer.about")}</span>
                </Link>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="tooltip-content bg-gray-900 text-white px-4 py-2 rounded-md text-sm z-50 shadow-md"
                  sideOffset={5}
                >
                  {t("navigation-tooltips.about")}
                  <Tooltip.Arrow className="tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
