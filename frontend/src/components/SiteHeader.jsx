import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Menu, X } from "lucide-react";
import LogoMark from "./LogoMark";
import { PRIMARY_NAV } from "../config";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./forum/NotificationBell";

import PromoBanner from "./PromoBanner";

const SiteHeader = ({ ctaHref = "/#course", ctaLabel = "Get Started", hideCta = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  let navItems = [...PRIMARY_NAV];
  
  if (!user) {
    navItems = navItems.filter((item) =>
      item.to !== "/profile" && item.to !== "/my-courses"
    );
  }
  
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "0hrmelk@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const isAdmin = user?.email && adminEmails.includes(user.email.toLowerCase());
  
  if (isAdmin && !navItems.find((item) => item.to === "/admin")) {
    navItems.push({ label: "Admin", to: "/admin" });
  }

  const handleLogout = async () => {
    try {
      logout();
      setMobileMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.warn("Logout failed", error.message);
      setMobileMenuOpen(false);
      navigate("/");
    }
  };

  return (
    <>
    <PromoBanner />
    <header className="sticky top-0 left-0 right-0 z-40 bg-neo-bg border-b-4 border-neo-black relative">
      <nav className="container mx-auto px-4 md:px-6 py-4 flex flex-wrap justify-between items-center bg-neo-bg">
        <Link to="/" className="inline-flex shrink-0 z-50">
          <LogoMark />
        </Link>

        {/* Desktop elements */}
        <div className="flex items-center justify-end flex-wrap flex-1 gap-2 md:gap-4 z-50">
          <div className="hidden lg:flex items-center gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "text-lg font-bold hover:text-neo-main transition-colors",
                    isActive ? "text-neo-main underline decoration-4" : "text-neo-black",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {!hideCta && !user && (
            <a href={ctaHref} className="btn-neo hidden md:inline-block whitespace-nowrap">
              {ctaLabel}
            </a>
          )}

          {user ? (
            <div className="flex items-center gap-2 md:gap-3">
              <NotificationBell />
              <span className="hidden sm:inline-block text-xs md:text-sm font-mono bg-white border-2 border-neo-black px-2 md:px-3 py-1 truncate max-w-[150px] md:max-w-[200px]">
                {user.email}
              </span>
              <button type="button" className="btn-neo-black text-xs px-2 md:px-4 py-2" onClick={handleLogout}>
                Logout
              </button>
              
              {/* Mobile menu toggle button */}
              <button 
                type="button" 
                className="lg:hidden p-1 border-2 border-neo-black bg-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-neo-black text-xs md:text-sm px-3 md:px-6 py-2 md:py-3 whitespace-nowrap border-2 md:border-4">
                Login
              </Link>
              
              {/* Mobile menu toggle button */}
              <button 
                type="button" 
                className="lg:hidden p-1 border-2 border-neo-black bg-white shrink-0"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Navigation Menu Dropdown */}
      <div 
        className={clsx(
          "absolute top-full left-0 right-0 bg-neo-bg border-b-4 border-neo-black overflow-hidden transition-all duration-300 lg:hidden",
          mobileMenuOpen ? "max-h-[400px] border-b-4 pb-4" : "max-h-0 border-b-0"
        )}
      >
        <div className="container mx-auto px-6 py-2 flex flex-col gap-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "block text-xl font-bold hover:text-neo-main transition-colors py-2 border-b-2 border-dashed border-gray-300",
                  isActive ? "text-neo-main" : "text-neo-black",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          {!hideCta && !user && (
            <a href={ctaHref} onClick={() => setMobileMenuOpen(false)} className="block text-xl font-bold py-2 text-neo-main border-b-2 border-dashed border-gray-300">
              {ctaLabel}
            </a>
          )}
          {user && (
            <div className="pt-2 sm:hidden text-sm font-mono text-gray-500 truncate">
               Logged in as: {user.email}
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
};

export default SiteHeader;
