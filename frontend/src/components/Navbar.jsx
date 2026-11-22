import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-line bg-card">
      <div className="w-full px-6 lg:px-10 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
          <span className="font-display font-700 text-xl tracking-tight text-ink">found<span className="text-teal">EX</span></span>
          <p className="font-body text-inkfaint">Reunites you with everything you've lost.</p>
          <span className="rotate-stamp inline-block font-mono font-stamp text-[9px] uppercase text-stamp border border-stamp/40 px-1.5 py-0.5 rounded-sm">
            except your ex
          </span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-5 font-body text-sm text-ink">
            <Link to="/report/lost" className="hover:text-mustardDark">Report lost</Link>
            <Link to="/report/found" className="hover:text-tealDark">Report found</Link>
            <Link to="/feed" className="hover:text-tealDark">Matches feed</Link>
            <Link to="/mine" className="hover:text-tealDark">My reports</Link>
            <span className="text-inkfaint">|</span>
            <span className="text-inkfaint">{user.name?.split(" ")[0]}</span>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="text-inkfaint hover:text-stamp underline underline-offset-2"
            >
              Log out
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-4 font-body text-sm">
            <Link to="/login" className="text-ink hover:text-tealDark">Log in</Link>
            <Link
              to="/register"
              className="bg-ink text-paper px-3 py-1.5 rounded-sm hover:bg-tealDark transition-colors"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
