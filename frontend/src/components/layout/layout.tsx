import React, { JSX } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { House, LogIn, Info, Menu, ListTodo, LucideProps } from "lucide-react";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import * as Separator from "@radix-ui/react-separator";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
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
  /** Label to display */
  label: string;
  /** Icon component to display */
  icon: LucideIconType;
  /** Optional tooltip text */
  tooltip?: string;
}

/**
 * NavLink component displaying a navigation item with tooltip
 * @param {Object} props - Component properties
 * @param {NavItem} props.item - Navigation item data
 * @param {boolean} props.isActive - Whether the link is currently active
 */
const NavLink: React.FC<{ item: NavItem; isActive: boolean }> = ({ item, isActive }) => {
  const Icon = item.icon;

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
                <span>{item.label}</span>
              </Link>
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        </Tooltip.Trigger>
        {item.tooltip && (
          <Tooltip.Portal>
            <Tooltip.Content
              className="tooltip-content bg-gray-900 text-white px-4 py-2 rounded-md text-sm z-50 shadow-md"
              sideOffset={5}
            >
              {item.tooltip}
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
const MobileMenuItem: React.FC<{ item: NavItem }> = ({ item }) => {
  const Icon = item.icon;

  return (
    <DropdownMenu.Item asChild>
      <Link
        to={item.path}
        className="flex items-center p-2 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
      >
        <Icon aria-hidden="true" size={16} className="inline-block mr-1" />
        <span>{item.label}</span>
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

  // Navigation items configuration
  const navItems: NavItem[] = [
    {
      path: "/",
      label: "Home",
      icon: House,
      tooltip: "Go to homepage",
    },
    {
      path: "/auth",
      label: "Login",
      icon: LogIn,
      tooltip: "Sign in to your account",
    },
    {
      path: "/requests",
      label: "Requests",
      icon: ListTodo,
      tooltip: "Manage your requests",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Navbar using Radix UI NavigationMenu */}
      <NavigationMenu.Root className="fixed top-0 left-0 right-0 bg-gray-800 text-white p-4 z-50 shadow-md">
        <NavigationMenu.List className="flex gap-4">
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-4">
            {navItems.map(item => (
              <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
            ))}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-2 rounded-md transition-colors duration-200 hover:bg-gray-700" aria-label="Menu">
                  <Menu aria-hidden="true" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="bg-gray-800 rounded-md shadow-lg p-2 min-w-[150px] origin-top-left">
                  {navItems.map(item => (
                    <MobileMenuItem key={item.path} item={item} />
                  ))}
                  <DropdownMenu.Arrow className="dropdown-arrow" />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
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
                  <span>About</span>
                </Link>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="tooltip-content bg-gray-900 text-white px-4 py-2 rounded-md text-sm z-50 shadow-md"
                  sideOffset={5}
                >
                  About this application
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
