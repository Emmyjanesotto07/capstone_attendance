import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  LogOut,
  UserCircle,
  LayoutDashboard,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  Users,
  FileSpreadsheet,
  Wallet,
  Loader
} from "lucide-react";
import PageSkeleton from "../components/PageSkeleton";
import { clearAuthSession, getAuthToken, getAuthUserFromToken } from "../utils/authSession";
import { getNetworkBasedSkeletonDelay } from "../utils/networkSkeleton";

export default function AdminForecasting() {
  const CAMPUS_OPTIONS = [
    { value: "all", label: "All Offices" },
    { value: "tourism", label: "Tourism" },
    { value: "mayor's office", label: "Mayor's Office" },
    { value: "hrmo", label: "HRMO" },
    { value: "sb", label: "SB" },
    { value: "vice mayor office", label: "Vice Mayor Office" },
    { value: "mpdo", label: "MPDO" },
    { value: "mswdo", label: "MSWDO" },
    { value: "meo", label: "MEO" },
    { value: "mao", label: "MAO" },
    { value: "budget", label: "Budget" },
    { value: "malasakit", label: "Malasakit" },
    { value: "gad", label: "GAD" },
    { value: "bac", label: "BAC" },
    { value: "treasurer", label: "Treasurer" },
    { value: "accounting", label: "Accounting" },
    { value: "masso", label: "MASSO" },
    { value: "gso", label: "GSO" },
    { value: "mcr", label: "MCR" }
  ];

  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_API_URL;
  const token = getAuthToken();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme) {
      return savedTheme === "dark";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingForecasts, setLoadingForecasts] = useState(true);
  const [forecasts, setForecasts] = useState([]);
  const [error, setError] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("all");

  const authUser = getAuthUserFromToken();
  const email = authUser?.email || "admin@minsu.edu.ph";

  const navItems = useMemo(
    () => [
      { label: "Admin Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Attendance Records", to: "/attendance/records", icon: FileSpreadsheet },
      { label: "Accounting", to: "/accounting", icon: Wallet },
      { label: "Forecasting", to: "/admin/forecasting", icon: BarChart3 },
      { label: "Manage Users", to: "/admin/users", icon: Users },
      { label: "Settings", to: "/settings", icon: Settings }
    ],
    []
  );

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const delay = getNetworkBasedSkeletonDelay();
    const timer = setTimeout(() => setPageLoading(false), delay);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchForecasts = async () => {
      if (!token) {
        navigate("/");
        return;
      }

      setLoadingForecasts(true);
      setError("");

      try {
        const queryParams = new URLSearchParams();

        if (selectedCampus !== "all") {
          queryParams.set("campus", selectedCampus);
        }

        const queryText = queryParams.toString();
        const endpoint = `${API}/api/admin/forecasting/next-absence${queryText ? `?${queryText}` : ""}`;

        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || data.error || "Failed to load forecasting data.");
          return;
        }

        setForecasts(Array.isArray(data.forecasts) ? data.forecasts : []);
      } catch {
        setError("Connection error while loading forecasting data.");
      } finally {
        setLoadingForecasts(false);
      }
    };

    fetchForecasts();
  }, [API, navigate, token, selectedCampus]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const predictableCount = forecasts.filter((item) => !!item.predictedNextAbsentDate).length;

  if (pageLoading) {
    return <PageSkeleton dark={isDarkMode} type="dashboard" />;
  }

  return (
    <div className={`min-h-screen p-3 md:p-4 ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`}>
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>

          <aside className={`absolute left-0 top-0 h-full w-80 border-r shadow-2xl overflow-hidden ${
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          }`}>
            <div
              className={`px-5 py-6 border-b ${
                isDarkMode ? "border-slate-800 bg-gradient-to-br from-green-950 to-slate-900" : "border-slate-200 bg-gradient-to-br from-green-50 via-white to-amber-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
                    HRMO
                  </p>
                  <h2 className={`mt-2 text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Admin Menu</h2>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Manage forecasting and planning tools from one place.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className={`p-2 rounded-xl border transition-colors ${
                    isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                  <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Role</p>
                  <p className={`mt-1 text-base font-semibold capitalize ${isDarkMode ? "text-white" : "text-slate-900"}`}>{authUser?.role || "staff"}</p>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                  <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Offices</p>
                  <p className={`mt-1 text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{selectedCampus === "all" ? "All Offices" : selectedCampus}</p>
                </div>
              </div>

              <div className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Signed in as</p>
                <p className={`mt-1 text-sm font-semibold break-all ${isDarkMode ? "text-white" : "text-slate-900"}`}>{authUser?.CompleteName || authUser?.name || "User"}</p>
                <p className={`text-xs mt-1 break-all ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{authUser?.email || ""}</p>
              </div>
            </div>

            <div className="p-4">
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
                        isActive
                          ? "border-green-600 bg-green-600 text-white shadow-lg shadow-green-600/20"
                          : isDarkMode
                            ? "border-slate-800 bg-slate-800/40 text-slate-200 hover:border-slate-700 hover:bg-slate-800"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-green-200 hover:bg-green-50"
                      }`}
                    >
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-white/20"
                          : isDarkMode
                            ? "bg-slate-700 text-slate-200 group-hover:bg-slate-700"
                            : "bg-white text-slate-600 group-hover:bg-green-100"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[288px_1fr] gap-4 items-start">
        <aside className={`hidden md:block rounded-3xl shadow-sm overflow-hidden sticky top-4 self-start border ${
          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}>
          <div className={`px-5 py-6 border-b ${isDarkMode ? "border-slate-800 bg-gradient-to-br from-green-950 to-slate-900" : "border-slate-200 bg-gradient-to-br from-green-50 via-white to-amber-50"}`}>
            <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
              Municipality of Bongabong
            </p>
            <h2 className={`mt-2 text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Admin Menu</h2>
            <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Manage forecasting and planning tools from one place.</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Role</p>
                <p className={`mt-1 text-lg font-semibold capitalize ${isDarkMode ? "text-white" : "text-slate-900"}`}>{authUser?.role || "staff"}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Offices</p>
                <p className={`mt-1 text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{selectedCampus === "all" ? "All Offices" : selectedCampus}</p>
              </div>
            </div>

            <div className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Signed in as</p>
              <p className={`mt-1 text-sm font-semibold break-all ${isDarkMode ? "text-white" : "text-slate-900"}`}>{authUser?.CompleteName || authUser?.name || "User"}</p>
              <p className={`text-xs mt-1 break-all ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{authUser?.email || ""}</p>
            </div>
          </div>

          <div className="p-4">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
                      isActive
                        ? "border-green-600 bg-green-600 text-white shadow-lg shadow-green-600/20"
                        : isDarkMode
                          ? "border-slate-800 bg-slate-800/40 text-slate-200 hover:border-slate-700 hover:bg-slate-800"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-green-200 hover:bg-green-50"
                    }`}
                  >
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? "bg-white/20"
                        : isDarkMode
                          ? "bg-slate-700 text-slate-200 group-hover:bg-slate-700"
                          : "bg-white text-slate-600 group-hover:bg-green-100"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </aside>

        <main className={`rounded-2xl shadow-sm overflow-hidden border ${
          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}>
          <div className={`px-6 py-4 border-b flex items-center justify-between relative ${
            isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"
          }`}>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className={`md:hidden inline-flex items-center justify-center p-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-slate-700 border-slate-600 text-slate-200"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
              >
                <Menu className="w-4 h-4" />
              </button>
              <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Admin Panel</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  isDarkMode
                    ? "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDarkMode ? "Light" : "Dark"}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    isDarkMode
                      ? "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <UserCircle className="w-4 h-4" />
                  User
                </button>

                {showUserMenu && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg border shadow-lg overflow-hidden z-20 ${
                    isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                  }`}>
                    <Link
                      to="/settings"
                      className={`w-full px-4 py-2 text-sm inline-flex items-center gap-2 transition-colors ${
                        isDarkMode ? "text-slate-200 hover:bg-slate-700" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={`w-full px-4 py-2 text-sm inline-flex items-center gap-2 transition-colors ${
                        isDarkMode ? "text-red-300 hover:bg-slate-700" : "text-red-600 hover:bg-slate-100"
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold inline-flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                <BarChart3 className="w-7 h-7 text-indigo-600" />
                Absence Forecasting
              </h1>
              <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Predicts each employee&apos;s next likely absent date based on weekday absence pattern from recent attendance history.
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"}`}>
              <label className={`text-xs font-semibold uppercase ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Offices</label>
              <div className="mt-2 max-w-xs">
                <select
                  value={selectedCampus}
                  onChange={(event) => setSelectedCampus(event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                  }`}
                >
                  {CAMPUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Employees analyzed</p>
                <p className={`text-xl font-semibold mt-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{forecasts.length}</p>
              </div>
              <div className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>With predicted date</p>
                <p className={`text-xl font-semibold mt-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{predictableCount}</p>
              </div>
              <div className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Signed in as</p>
                <p className={`text-sm font-semibold mt-1 break-all ${isDarkMode ? "text-white" : "text-slate-900"}`}>{email}</p>
              </div>
            </div>

            {error && (
              <div className={`rounded-lg border px-4 py-3 text-sm ${
                isDarkMode ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-red-200 bg-red-50 text-red-700"
              }`}>
                {error}
              </div>
            )}

            <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
              <div className={`grid grid-cols-[1.2fr_.9fr_.9fr_.9fr_.9fr] gap-3 px-4 py-2 text-xs font-semibold uppercase ${
                isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
              }`}>
                <span>Employee</span>
                <span>Office</span>
                <span>Likely Absent</span>
                <span>Weekday Pattern</span>
                <span>Absence Rate</span>
              </div>

              <div className={`max-h-[500px] overflow-y-auto ${isDarkMode ? "bg-slate-900/20" : "bg-white"}`}>
                {loadingForecasts ? (
                  <div className={`px-4 py-6 text-sm inline-flex items-center gap-2 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    <Loader className="w-4 h-4 animate-spin" />
                    Loading forecasting data...
                  </div>
                ) : forecasts.length === 0 ? (
                  <div className={`px-4 py-6 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    No forecasting records available.
                  </div>
                ) : (
                  forecasts.filter((item) => {
                    const name = String(item.completeName || "").toLowerCase();
                    return !name.includes("cabrera") && !name.includes("xian");
                  }).map((item) => (
                    <div
                      key={item.userId}
                      className={`grid grid-cols-[1.2fr_.9fr_.9fr_.9fr_.9fr] gap-3 px-4 py-3 text-sm border-t first:border-t-0 ${
                        isDarkMode ? "border-slate-700 text-slate-200" : "border-slate-200 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-medium">{item.completeName || item.email}</p>
                        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{item.employeeBiometricId || "No biometric ID"}</p>
                      </div>
                      <span className="capitalize">{item.campus || "—"}</span>
                      <span>{item.predictedNextAbsentDate || "—"}</span>
                      <span>{item.dominantAbsentWeekday || "—"}</span>
                      <span>{item.absentRate ? `${Math.round(item.absentRate * 100)}%` : "—"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
