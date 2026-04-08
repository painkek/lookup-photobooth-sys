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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* Logo with responsive sizing */}
              <div className="relative">
                {/* Desktop logo */}
                <img
                  src="/logo.png"
                  alt="Lookup Photobooth"
                  className="hidden md:block w-12 h-12 object-contain rounded-lg"
                />
                {/* Mobile logo */}
                <img
                  src="/logo.png"
                  alt="Lookup Photobooth"
                  className="block md:hidden w-8 h-8 object-contain rounded-lg"
                />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900">
                  Lookup Photobooth
                </h1>
                <p className="text-xs md:text-sm text-gray-600">
                  {branch.name}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm md:text-base"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Rest of the component remains the same */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <nav className="w-64 flex-shrink-0 hidden md:block">
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-1 sticky top-20">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                      isActive
                        ? "bg-purple-50 text-purple-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
            <div className="flex justify-around py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
                      isActive ? "text-purple-600" : "text-gray-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <main className="flex-1 pb-20 md:pb-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
