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
  Users,
  History,
  Wallet,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

/**
 * Layout Component — CSS-variable theming
 * Colors come from the variables in index.css (:root = light, .dark = dark).
 * The ThemeToggle here controls the whole app.
 */
export default function Layout({
  branch,
  staff,
  onLogout,
  onSwitchStaff,
  children,
}) {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/sales", icon: ShoppingCart, label: "Sales" },
    { path: "/expenses", icon: TrendingDown, label: "Expenses" },
    { path: "/inventory", icon: Package, label: "Inventory" },
    { path: "/schedule", icon: Calendar, label: "Schedule" },
    { path: "/reports", icon: FileText, label: "Reports" },
    ...(staff?.role === "owner"
      ? [
          { path: "/budget", icon: Wallet, label: "Budget" },
          { path: "/audit-log", icon: History, label: "Audit Log" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-2)] selection:bg-purple-500/30">
      {/* Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-md">
        <div className="px-4 py-3 mx-auto max-w-7xl sm:px-6 lg:px-8 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute transition duration-1000 rounded-lg opacity-25 -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 blur group-hover:opacity-50 group-hover:duration-200"></div>
                <img
                  src="/logo.png"
                  alt="Lookup Photobooth"
                  className="relative w-10 h-10 md:w-12 md:h-12 object-contain rounded-lg bg-[var(--logo-chip)] border border-[var(--border-hover)]"
                />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-semibold tracking-tight text-[var(--text-1)]">
                  Lookup{" "}
                  <span className="text-[var(--accent)]">Photobooth</span>
                </h1>
                <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-[var(--text-3)] font-medium">
                  {branch.name}
                  {staff && (
                    <>
                      <span className="mx-1.5 opacity-40">&middot;</span>
                      <span className="text-[var(--accent)]">
                        {staff.name}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {staff && onSwitchStaff && (
                <button
                  onClick={onSwitchStaff}
                  className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-2)] hover:text-[var(--accent)] transition-all duration-300 rounded-full border border-[var(--border)] hover:border-purple-500/20 hover:bg-purple-500/5"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Switch Staff</span>
                </button>
              )}
              <button
                onClick={onLogout}
                className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-2)] hover:text-[var(--danger)] transition-all duration-300 rounded-full border border-[var(--border)] hover:border-red-500/30 hover:bg-red-500/5"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Sidebar Navigation (Desktop) */}
          <nav className="flex-shrink-0 hidden w-64 md:block">
            <div className="sticky space-y-2 top-28">
              <div className="px-4 mb-4">
                <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
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
                        ? "bg-purple-500/10 border-purple-500/20 text-[var(--accent)] shadow-[0_0_20px_-5px_rgba(168,85,247,0.15)]"
                        : "border-transparent text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--chip-bg)]"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive
                          ? "text-[var(--accent)]"
                          : "group-hover:text-[var(--accent)]"
                      }`}
                    />
                    <span className="font-medium tracking-wide">
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom Navigation (Mobile) */}
          <div className="fixed z-50 md:hidden bottom-6 left-4 right-4">
            <div className="bg-[var(--nav-pill-bg)] backdrop-blur-xl border border-[var(--border-hover)] rounded-2xl shadow-2xl px-2 py-2">
              <div className="flex items-center justify-around">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                        isActive
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-3)]"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {isActive && (
                        <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--accent)]" />
                      )}
                    </Link>
                  );
                })}
                {staff && onSwitchStaff && (
                  <button
                    onClick={onSwitchStaff}
                    className="flex flex-col items-center gap-1 p-2 text-[var(--text-3)] hover:text-[var(--accent)]"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="flex flex-col items-center gap-1 p-2 text-[var(--text-3)] hover:text-[var(--danger)]"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 pb-24 md:pb-0">
            <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-3xl p-6 min-h-[60vh]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
