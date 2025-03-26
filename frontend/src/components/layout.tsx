import { Outlet, Link } from "react-router-dom";

export default function Layout() {
  return (
    <div>
      <nav className="p-4 bg-gray-800 text-white flex gap-4">
        <Link to="/">🏡 Home</Link>
        <Link to="/about">ℹ️ About</Link>
      </nav>
      <main className="p-4">
        <Outlet /> {/* Aquí se renderiza el contenido de cada ruta */}
      </main>
    </div>
  );
}
