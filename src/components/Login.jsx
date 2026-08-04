import React, { useState } from "react";
import { LogIn, Eye, EyeOff, Camera } from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Login Component — CSS-variable theming.
 * Renders before Layout, but the theme still applies because the
 * index.html head script sets the .dark class before React loads.
 */
export default function Login({ onLogin }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: supabaseError } = await supabase
      .from("branches")
      .select("*")
      .eq("code", code.toLowerCase())
      .single();

    if (supabaseError || !data) {
      setError("Invalid branch code");
      setLoading(false);
      return;
    }

    if (data.password !== password) {
      setError("Invalid password");
      setLoading(false);
      return;
    }

    onLogin({ id: data.id, name: data.name, code: data.code });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-2)] selection:bg-purple-500/30 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[10%] left-[20%] w-[35%] h-[35%] bg-purple-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border-hover)] rounded-3xl shadow-2xl p-8 transition-all duration-300 hover:border-purple-500/20">
          {/* Logo Section */}
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              <div className="relative bg-[var(--logo-chip)] p-4 rounded-full border border-[var(--border-hover)]">
                <img
                  className="w-28 h-28 object-contain"
                  src="/logo.png"
                  alt="Lookup Photobooth"
                />
              </div>
            </div>
          </div>

          {/* Title Section */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-1)]">
              Lookup <span className="text-[var(--accent)]">Photobooth</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-3)] font-medium mt-2">
              Branch Management System
            </p>
            <div className="mt-3 h-px bg-gradient-to-r from-transparent via-[var(--border-hover)] to-transparent" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Branch Code Field */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-2)] uppercase tracking-wider mb-2">
                Branch Code
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--chip-bg)] border border-[var(--border-hover)] rounded-xl text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all duration-300"
                  placeholder="branch"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/0 via-purple-600/0 to-indigo-600/0 group-focus-within:from-purple-600/5 group-focus-within:via-purple-600/5 group-focus-within:to-indigo-600/5 pointer-events-none transition-all duration-500" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-2)] uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-[var(--chip-bg)] border border-[var(--border-hover)] rounded-xl text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all duration-300"
                  placeholder="••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/0 via-purple-600/0 to-indigo-600/0 group-focus-within:from-purple-600/5 group-focus-within:via-purple-600/5 group-focus-within:to-indigo-600/5 pointer-events-none transition-all duration-500" />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center justify-center gap-2 text-[var(--danger)] text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full mt-6 overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-[1px] transition-all duration-300 hover:shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="relative flex items-center justify-center gap-2 rounded-xl bg-[var(--page-bg)] px-4 py-3 transition-all duration-300 group-hover:bg-transparent">
                <span className="font-medium text-[var(--text-1)] group-hover:text-white">
                  {loading ? "Logging in..." : "Login"}
                </span>
                <LogIn className="w-4 h-4 text-[var(--accent)] group-hover:text-white transition-colors" />
              </div>
            </button>
          </form>

          {/* Footer Decoration */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-[10px] text-[var(--text-3)] uppercase tracking-wider">
              <Camera className="w-3 h-3" />
              <span>Secure Branch Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
