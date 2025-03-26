import React, { JSX } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { House, LogIn, Info, Menu } from "lucide-react";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import * as Separator from "@radix-ui/react-separator";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import "./layout.css";

/**
 * Navigation item structure for the main menu
 * @interface NavItem
 */
interface NavItem {
  /** Path to navigate to */
  path: string;
  /** Label to display */
  label: string;
  /** Icon component to display */
  icon: React.ReactNode;
  /** Optional tooltip text */
  tooltip?: string;
}

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
      icon: <House className="nav-icon" aria-hidden="true" />,
      tooltip: "Go to homepage",
    },
    {
      path: "/auth",
      label: "Login",
      icon: <LogIn className="nav-icon" aria-hidden="true" />,
      tooltip: "Sign in to your account",
    },
  ];

  return (
    <div className="layout-container">
      {/* Navbar using Radix UI NavigationMenu */}
      <NavigationMenu.Root className="layout-navbar">
        <NavigationMenu.List className="flex gap-4">
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-4">
            {navItems.map(item => (
              <Tooltip.Provider key={item.path} delayDuration={300}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <NavigationMenu.Item>
                      <NavigationMenu.Link asChild active={location.pathname === item.path} className="nav-link">
                        <Link to={item.path}>
                          {item.icon}
                          <span className="ml-1">{item.label}</span>
                        </Link>
                      </NavigationMenu.Link>
                    </NavigationMenu.Item>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content className="tooltip-content" sideOffset={5}>
                      {item.tooltip}
                      <Tooltip.Arrow className="tooltip-arrow" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            ))}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="mobile-menu-button" aria-label="Menu">
                  <Menu aria-hidden="true" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="dropdown-content">
                  {navItems.map(item => (
                    <DropdownMenu.Item key={item.path} asChild>
                      <Link to={item.path} className="dropdown-item">
                        {item.icon}
                        <span className="ml-1">{item.label}</span>
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Arrow className="dropdown-arrow" />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </NavigationMenu.List>
      </NavigationMenu.Root>

      {/* Main content with padding to avoid overlap with fixed elements */}
      <main className="layout-main" role="main">
        <Outlet /> {/* Render the content of each route */}
      </main>

      {/* Footer */}
      <footer className="layout-footer" role="contentinfo">
        <div className="footer-content">
          <p className="footer-copyright">&copy; 2025 FAST-IBAN Project</p>
          <Separator.Root className="footer-separator" decorative orientation="vertical" />
          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Link to="/about" className="footer-link">
                  <Info className="footer-icon" size={16} aria-hidden="true" />
                  <span>About</span>
                </Link>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="tooltip-content" sideOffset={5}>
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
