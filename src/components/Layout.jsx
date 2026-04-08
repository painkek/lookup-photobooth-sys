import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingDown,
  Package,
  Calendar,
  FileText,
  LogOut,
} from "lucide-react";

/**
 * DarkVeil Layout Component
 * Aesthetic: Deep obsidian backgrounds, glassmorphism, subtle violet glows, and ethereal borders.
 */
export default function Layout({ branch, onLogout, children }) {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/sales", icon: ShoppingCart, label: "Sales" },
    { path: "/expenses", icon: TrendingDown, label: "Expenses" },
    { path: "/inventory", icon: Package, label: "Inventory" },
    { path: "/schedule", icon: Calendar, label: "Schedule" },
    { path: "/reports", icon: FileText, label: "Reports" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 selection:bg-purple-500/30">
      {/* Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-indigo-900/10 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <img
                  src="/logo.png"
                  alt="Lookup Photobooth"
                  className="relative w-10 h-10 md:w-12 md:h-12 object-contain rounded-lg bg-[#121214] border border-white/10"
                />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-semibold tracking-tight text-white">
                  Lookup <span className="text-purple-400">Photobooth</span>
                </h1>
                <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-slate-500 font-medium">
                  {branch.name}
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-red-400 transition-all duration-300 rounded-full border border-white/5 hover:border-red-500/30 hover:bg-red-500/5"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation (Desktop) */}
          <nav className="w-64 flex-shrink-0 hidden md:block">
            <div className="sticky top-28 space-y-2">
              <div className="px-4 mb-4">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Main Menu
                </p>
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 border ${
                      isActive
                        ? "bg-purple-500/10 border-purple-500/20 text-purple-300 shadow-[0_0_20px_-5px_rgba(168,85,247,0.15)]"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive
                          ? "text-purple-400"
                          : "group-hover:text-purple-300"
                      }`}
                    />
                    <span className="font-medium tracking-wide">
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom Navigation (Mobile) */}
          <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
            <div className="bg-[#121214]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-2 py-2">
              <div className="flex justify-around items-center">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                        isActive ? "text-purple-400" : "text-slate-500"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {isActive && (
                        <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-purple-400" />
                      )}
                    </Link>
                  );
                })}
                <button
                  onClick={onLogout}
                  className="flex flex-col items-center gap-1 p-2 text-slate-500 hover:text-red-400"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 pb-24 md:pb-0">
            <div className="bg-[#121214]/40 border border-white/5 rounded-3xl p-6 min-h-[60vh] backdrop-blur-sm">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
