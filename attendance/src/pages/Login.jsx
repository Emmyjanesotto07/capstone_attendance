import { useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Loader, Moon, Sun } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageSkeleton from "../components/PageSkeleton";
import { getNetworkBasedSkeletonDelay } from "../utils/networkSkeleton";
import { setAuthToken } from "../utils/authSession";

export default function Login() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme) {
      return savedTheme === "dark";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("rememberMe") === "true");

  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      return;
    }

    localStorage.removeItem("rememberMe");
  }, [rememberMe]);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const delay = getNetworkBasedSkeletonDelay();
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await res.json();

      if (data.token) {
        setAuthToken(data.token, rememberMe);

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email.trim());
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        setSuccess(true);
        if (!rememberMe) {
          setEmail("");
        }
        setPassword("");
        setTimeout(() => {
          setSuccess(false);
          if ((data.role || "staff") === "admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/staff/dashboard");
          }
        }, 3000);
      } else {
        setError(data.message || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("Connection error. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email && password;

  if (pageLoading) {
    return <PageSkeleton dark={isDarkMode} type="auth" />;
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900"
          : "bg-gradient-to-br from-slate-50 via-emerald-50 to-white"
      }`}
    >
      {/* Animated background elements */}
      <div
        className={`absolute top-0 left-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-pulse ${
          isDarkMode ? "bg-emerald-500 opacity-10" : "bg-emerald-300 opacity-20"
        }`}
      ></div>
      <div
        className={`absolute bottom-0 right-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-pulse ${
          isDarkMode ? "bg-blue-500 opacity-10" : "bg-blue-300 opacity-20"
        }`}
        style={{ animationDelay: "2s" }}
      ></div>

      <button
        type="button"
        onClick={() => setIsDarkMode((prev) => !prev)}
        className={`absolute top-6 right-6 z-10 inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors duration-200 ${
          isDarkMode
            ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
        }`}
        aria-label="Toggle theme"
      >
        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {isDarkMode ? "Light" : "Dark"}
      </button>

      {/* Main container with split layout */}
      <div className="relative w-full max-w-6xl">
        <div className={`rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-300 ${
          isDarkMode ? "border-slate-700" : "border-slate-200"
        }`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
            {/* Left side - Municipality Info */}
            <div className={`hidden lg:flex lg:flex-col lg:justify-between p-12 relative overflow-hidden ${
              isDarkMode
                ? "bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950"
                : "bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700"
            }`}>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>

              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="mb-8">
                  <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-xl border border-white/20">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Attendance System</h2>
                  <p className="text-emerald-100 text-sm">Municipality Management Portal</p>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Real-time Tracking</h3>
                      <p className="text-emerald-100 text-xs">Monitor attendance across departments</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Secure Access</h3>
                      <p className="text-emerald-100 text-xs">Role-based authentication system</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Analytics & Reports</h3>
                      <p className="text-emerald-100 text-xs">Comprehensive attendance insights</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Multi-Department Support</h3>
                      <p className="text-emerald-100 text-xs">Mayor's Office & HRMO management</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer info */}
              <div className="relative z-10 pt-8 border-t border-white/10">
                <p className="text-emerald-100 text-xs">
                  📍 Municipality Attendance Management System
                </p>
                <p className="text-emerald-100 text-xs mt-1">
                  All access is monitored and logged for security purposes.
                </p>
              </div>
            </div>

            {/* Right side - Login Form */}
            <div className={`p-8 md:p-10 transition-colors duration-300 ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}>
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>Welcome Back</h1>
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Sign in to your account</p>
            </div>

            {/* Status messages */}
            {error && (
              <div
                className={`mb-6 p-4 border rounded-lg flex items-start gap-3 animate-in slide-in-from-top ${
                  isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
                }`}
              >
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDarkMode ? "text-red-400" : "text-red-500"}`} />
                <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-700"}`}>{error}</p>
              </div>
            )}

            {success && (
              <div
                className={`mb-6 p-4 border rounded-lg flex items-start gap-3 animate-in slide-in-from-top ${
                  isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"
                }`}
              >
                <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                <p className={`text-sm ${isDarkMode ? "text-green-300" : "text-green-700"}`}>Login successful! Redirecting...</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={login} className="space-y-5">
              {/* Email field */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Email</label>
                <div
                  className={`relative transition-all duration-200 ${
                    focusedField === "email" ? "ring-2 ring-emerald-500" : ""
                  }`}
                >
                  <Mail
                    className={`absolute left-3 top-3.5 w-5 h-5 pointer-events-none ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                      isDarkMode
                        ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Password</label>
                <div
                  className={`relative transition-all duration-200 ${
                    focusedField === "password" ? "ring-2 ring-emerald-500" : ""
                  }`}
                >
                  <Lock
                    className={`absolute left-3 top-3.5 w-5 h-5 pointer-events-none ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                      isDarkMode
                        ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-3.5 transition-colors duration-200 ${
                      isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={`w-4 h-4 border rounded cursor-pointer accent-emerald-600 ${
                      isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-slate-300"
                    }`}
                  />
                  <span
                    className={`transition-colors ${
                      isDarkMode ? "text-slate-400 group-hover:text-slate-200" : "text-slate-600 group-hover:text-slate-800"
                    }`}
                  >
                    Remember me
                  </span>
                </label>
                <Link to="/forgot-password" className="text-emerald-500 hover:text-emerald-400 transition-colors font-medium">
                  Forgot password?
                </Link>
              </div>

              {/* Login button */}
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full mt-8 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${isDarkMode ? "border-slate-600" : "border-slate-300"}`}></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-2 ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500"}`}>
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Social buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 border rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium ${
                    isDarkMode
                      ? "bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-700"
                      : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 0C4.477 0 0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.879V12.89h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.989C16.343 19.128 20 14.991 20 10c0-5.523-4.477-10-10-10z" />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 border rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium ${
                    isDarkMode
                      ? "bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-700"
                      : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M20 10.063C20 4.504 15.523 0 10 0S0 4.504 0 10.063c0 5.03 3.656 9.203 8.438 9.885v-6.987h-2.54V10.063h2.54V7.845c0-2.505 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.891h2.773l-.443 2.898h-2.33v6.987C16.344 19.266 20 15.093 20 10.063z" />
                  </svg>
                  Facebook
                </button>
              </div>

              {/* Sign up link */}
              <p className={`text-center text-sm mt-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Don't have an account?{" "}
                <Link to="/signup" className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                  Sign up
                </Link>
              </p>
            </form>
            </div>
          </div>
        </div>

        {/* Subtle shadow effect */}
        <div className="absolute inset-0 rounded-2xl shadow-2xl pointer-events-none" style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}></div>
      </div>
    </div>
  );
}
