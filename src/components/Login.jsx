import React, { useState } from "react";
import { Camera, LogIn, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-purple-100 p-3 rounded-full">
            <Camera className="w-12 h-12 text-purple-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Lookup Photobooth
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Branch Management System
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="ayala, tabaco, or legazpi"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            {loading ? "Logging in..." : "Login"}
            <LogIn className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="font-medium mb-1">Branch Credentials:</p>
          <p className="font-mono text-xs">ayala</p>
          <p className="font-mono text-xs">tabaco</p>
          <p className="font-mono text-xs">legazpi</p>
        </div>
      </div>
    </div>
  );
}
