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
            <a
              href="https://t.me/+pM1AwiZDA9k3NDI6"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-lg font-bold text-white bg-blue-500 px-4 py-2 border-2 border-neo-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all ml-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.559z" />
              </svg>
              Join Us
            </a>
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
          <a
            href="https://t.me/+pM1AwiZDA9k3NDI6"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 text-xl font-bold py-3 px-4 bg-blue-500 text-white border-4 border-neo-black shadow-[4px_4px_0px_rgba(0,0,0,1)] mt-2 mb-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.559z" />
            </svg>
            Join Us
          </a>
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
