import { Outlet, Link } from "react-router-dom";
import "./layout.css";

export default function Layout() {
  return (
    <div className="layout-container">
      {/* Navbar */}
      <nav className="layout-navbar">
        <Link to="/" className="nav-link">
          🏡 Home
        </Link>
      </nav>

      {/* Main content with padding to avoid overlap with fixed elements */}
      <main className="layout-main">
        <Outlet /> {/* Render the content of each route */}
      </main>

      {/* Footer */}
      <footer className="layout-footer">
        <p className="footer-copyright">&copy; 2025 FAST-IBAN Project</p>
        <Link to="/about" className="footer-link">
          About
        </Link>
      </footer>
    </div>
  );
}
