import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  LogOut,
  UserCircle,
  LayoutDashboard,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  ShieldBan,
  ShieldCheck,
  BadgeCheck,
  Fingerprint,
  Loader,
  Upload,
  Download,
  FileSpreadsheet,
  BarChart3,
  Wallet,
  Clock3
} from "lucide-react";
import PageSkeleton from "../components/PageSkeleton";
import { clearAuthSession, getAuthToken, getAuthUserFromToken } from "../utils/authSession";
import { getNetworkBasedSkeletonDelay } from "../utils/networkSkeleton";

const OFFICE_OPTIONS = [
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

const OFFICE_LABEL_MAP = OFFICE_OPTIONS.reduce((accumulator, office) => {
  if (office.value !== "all") {
    accumulator[office.value] = office.label;
  }

  return accumulator;
}, {});

const formatOfficeLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "mayors office") {
    return "Mayor's Office";
  }

  if (OFFICE_LABEL_MAP[normalized]) {
    return OFFICE_LABEL_MAP[normalized];
  }

  return String(value || "").toUpperCase();
};

export default function AdminUsers() {
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
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [campusFilter, setCampusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const authUser = getAuthUserFromToken();
  const role = authUser?.role || "staff";
  const adminEmail = authUser?.email || "admin@minsu.edu.ph";

  const navItems = useMemo(() => {
    const items = [
      {
        label: role === "admin" ? "Admin Dashboard" : "Staff Dashboard",
        to: role === "admin" ? "/admin/dashboard" : "/staff/dashboard",
        icon: LayoutDashboard
      },
      { label: "Attendance Records", to: "/attendance/records", icon: FileSpreadsheet },
      { label: "Manage Users", to: "/admin/users", icon: Users }
    ];

    if (role === "admin") {
      items.push({ label: "Accounting", to: "/accounting", icon: Wallet });
      items.push({ label: "Forecasting", to: "/admin/forecasting", icon: BarChart3 });
    }

    items.push({ label: "Settings", to: "/settings", icon: Settings });
    return items;
  }, [role]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = String(searchTerm || "").trim().toLowerCase();

    return users.filter((user) => {
      const userCampus = String(user.campus || "").trim().toLowerCase();
      const userName = String(user.CompleteName || "").trim().toLowerCase();

      // Exclude Cabrera and Xian
      if (userName.includes("cabrera") || userName.includes("xian")) {
        return false;
      }

      if (campusFilter !== "all" && userCampus !== campusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const textTargets = [
        user.CompleteName,
        user.email,
        user.employeeBiometricId,
        user.role,
        user.campus,
        user.college
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return textTargets.includes(normalizedSearch);
    });
  }, [users, campusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);

  const fetchUsers = async () => {
    if (!token) {
      navigate("/");
      return;
    }

    setLoadingUsers(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to load users.");
        return;
      }

      setUsers(data.users || []);
    } catch {
      setError("Connection error while loading users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const delay = getNetworkBasedSkeletonDelay();
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, campusFilter, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const runUserAction = async (userId, endpoint, body) => {
    if (!token) {
      navigate("/");
      return;
    }

    setActionLoadingId(userId);
    setError("");

    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Action failed.");
        return;
      }

      await fetchUsers();
    } catch {
      setError("Connection error while processing action.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBanToggle = async (user) => {
    if (user.isBanned) {
      await runUserAction(user.id, "unban");
      return;
    }

    const reason = window.prompt("Ban reason (optional):", "Policy violation");
    await runUserAction(user.id, "ban", { reason: reason || "No reason provided." });
  };

  const handleSetBiometricId = async (user) => {
    const currentValue = user.employeeBiometricId || "";
    const nextValue = window.prompt(`Set biometric ID for ${user.CompleteName}:`, currentValue);

    if (nextValue === null) {
      return;
    }

    await runUserAction(user.id, "biometric-id", { employeeBiometricId: nextValue });
  };

  const handleImportUsers = async (event) => {
    event.preventDefault();
    setError("");
    setImportSummary(null);

    if (!importFile) {
      setError("Please choose a CSV file first.");
      return;
    }

    setImportingCsv(true);
    setImportProgress(0);

    try {
      const formData = new FormData();
      formData.append("usersCsvFile", importFile);

      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API}/api/admin/users/import-csv`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (progressEvent) => {
          if (!progressEvent.lengthComputable) {
            return;
          }

          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setImportProgress(Math.min(100, Math.max(0, percent)));
        };

        xhr.onload = () => {
          let data = {};

          try {
            data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          } catch {
            data = {};
          }

          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            data
          });
        };

        xhr.onerror = () => reject(new Error("network_error"));
        xhr.send(formData);
      });

      const data = response.data || {};

      if (!response.ok) {
        setError(data.message || data.error || "Failed to import users.");
        return;
      }

      setImportProgress(100);
      setImportSummary({
        createdCount: Number(data.createdCount) || 0,
        skippedCount: Number(data.skippedCount) || 0,
        temporaryCredentials: Array.isArray(data.temporaryCredentials) ? data.temporaryCredentials : []
      });
      setImportFile(null);
      await fetchUsers();
    } catch {
      setError("Connection error while importing users.");
    } finally {
      setImportingCsv(false);
      setTimeout(() => setImportProgress(0), 400);
    }
  };

  const handleDownloadCsvFormat = () => {
    const sampleCsv = [
      "empno,lname,fname,mname,campus,college,role,email,password",
      "417,CABRERA,CHRISTIAN,I,BONGABONG,CCS,STAFF,christian.cabrera@minsu.edu.ph,MinSU123@!"
    ].join("\n");

    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee-import-format.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (pageLoading) {
    return <PageSkeleton dark={isDarkMode} type="dashboard" />;
  }

  return (
    <div
      className={`min-h-screen p-3 md:p-4 ${
        isDarkMode ? "bg-slate-950" : "bg-slate-100"
      }`}
    >
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={() => setIsSidebarOpen(false)}></div>

          <aside
            className={`absolute left-0 top-0 h-full w-80 border-r shadow-2xl overflow-hidden ${
              isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
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
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Quick access to all admin tools</p>
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

              <div className="mt-4 grid grid-cols-1 gap-2">
                <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                  <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Role</p>
                  <p className={`mt-1 text-base font-semibold capitalize ${isDarkMode ? "text-white" : "text-slate-900"}`}>{role}</p>
                </div>
              </div>
              <div className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Signed in as</p>
                <p className={`mt-1 text-sm font-semibold break-all ${isDarkMode ? "text-white" : "text-slate-900"}`}>{authUser?.CompleteName || authUser?.name || "Admin"}</p>
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
        <aside
          className={`hidden md:block rounded-3xl shadow-sm overflow-hidden sticky top-4 self-start border ${
            isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`px-5 py-6 border-b ${
              isDarkMode ? "border-slate-800 bg-gradient-to-br from-green-950 to-slate-900" : "border-slate-200 bg-gradient-to-br from-green-50 via-white to-amber-50"
            }`}
          >
            <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
              Municipality of Bongabong
            </p>
            <h2 className={`mt-2 text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Admin Menu</h2>
            <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Manage users and system tools from one place.</p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Role</p>
                <p className={`mt-1 text-lg font-semibold capitalize ${isDarkMode ? "text-white" : "text-slate-900"}`}>{role}</p>
              </div>
            </div>
            <div className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Signed in as</p>
              <p className={`mt-1 text-sm font-semibold break-all ${isDarkMode ? "text-white" : "text-slate-900"}`}>{authUser?.CompleteName || authUser?.name || "Admin"}</p>
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

        <main
          className={`rounded-2xl shadow-sm overflow-hidden border ${
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`px-6 py-4 border-b flex items-center justify-between relative ${
              isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"
            }`}
          >
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
              <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>User Management</p>
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
                  <div
                    className={`absolute right-0 mt-2 w-48 rounded-lg border shadow-lg overflow-hidden z-20 ${
                      isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                    }`}
                  >
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

          <div className="p-6 md:p-8 space-y-4">
            <div>
              <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                <Users className="w-8 h-8 text-emerald-600" />
                User Management
              </h1>
              <p className={`${isDarkMode ? "text-slate-400" : "text-slate-600"} mt-2`}>
                Signed in as {adminEmail} ({role.toUpperCase()})
              </p>
            </div>

            <form onSubmit={handleImportUsers} className={`rounded-xl border p-4 space-y-3 ${
              isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"
            }`}>
              <h2 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Import Employees via CSV</h2>
              <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Required columns: employee ID (e.g., empno) and office. If email/password is missing, they are auto-generated.
              </p>

              <button
                type="button"
                onClick={handleDownloadCsvFormat}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
              >
                <Download className="w-4 h-4" />
                Download CSV Format
              </button>

              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(event) => {
                  const selected = event.target.files?.[0] || null;
                  setImportFile(selected);
                }}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                }`}
              />

              <button
                type="submit"
                disabled={importingCsv || !importFile}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm"
              >
                {importingCsv ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import CSV
              </button>

              {(importingCsv || importProgress > 0) && (
                <div className="space-y-1">
                  <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`}>
                    <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${importProgress}%` }} />
                  </div>
                  <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Uploading... {importProgress}%</p>
                </div>
              )}

              {importSummary && (
                <div className={`rounded-lg border p-3 text-xs ${isDarkMode ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                  <p>Created: {importSummary.createdCount} · Skipped: {importSummary.skippedCount}</p>
                  {importSummary.temporaryCredentials.length > 0 && (
                    <p className="mt-1">
                      Auto credentials generated: {importSummary.temporaryCredentials.length}. Please save and share securely.
                    </p>
                  )}
                </div>
              )}
            </form>

            {error && (
              <div className={`rounded-lg border p-3 text-sm ${isDarkMode ? "bg-red-500/10 border-red-500/30 text-red-200" : "bg-red-50 border-red-200 text-red-700"}`}>
                {error}
              </div>
            )}

            <div className={`rounded-xl border p-4 grid grid-cols-1 md:grid-cols-3 gap-3 ${
              isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"
            }`}>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search name, email, ID, role..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div className="space-y-1">
                  <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Office</label>
                <select
                  value={campusFilter}
                  onChange={(event) => setCampusFilter(event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                  }`}
                >
                  {OFFICE_OPTIONS.map((office) => (
                    <option key={office.value} value={office.value}>
                      {office.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Rows per page</label>
                <select
                  value={String(rowsPerPage)}
                  onChange={(event) => setRowsPerPage(Number(event.target.value) || 10)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                  }`}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            {loadingUsers ? (
              <div className="space-y-3 animate-pulse">
                <div className={`h-12 rounded-lg ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`}></div>
                <div className={`h-12 rounded-lg ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`}></div>
                <div className={`h-12 rounded-lg ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`}></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse">
                  <thead>
                    <tr className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                      <th className="text-left py-3 px-2">User</th>
                      <th className="text-left py-3 px-2">Biometric ID</th>
                      <th className="text-left py-3 px-2">Role</th>
                      <th className="text-left py-3 px-2">Office</th>
                      <th className="text-left py-3 px-2">Status</th>
                      <th className="text-left py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className={`border-t ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                        <td className="py-3 px-2">
                          <div className="inline-flex items-center gap-3">
                            {user.profilePictureUrl ? (
                              <img
                                src={user.profilePictureUrl}
                                alt={user.CompleteName}
                                className="w-10 h-10 rounded-full object-cover border border-emerald-500/30"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full inline-flex items-center justify-center border ${
                                isDarkMode ? "border-slate-600 bg-slate-700 text-slate-300" : "border-slate-300 bg-white text-slate-500"
                              }`}>
                                <UserCircle className="w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <p className={isDarkMode ? "text-white font-medium" : "text-slate-900 font-medium"}>{user.CompleteName}</p>
                              <p className={isDarkMode ? "text-slate-400 text-sm" : "text-slate-600 text-sm"}>{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="inline-flex items-center gap-2">
                            <Fingerprint className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                            <span className={`text-sm ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                              {user.employeeBiometricId || "Not set"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className={`py-3 px-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                          {formatOfficeLabel(user.campus)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs font-medium ${user.isBanned ? "text-red-500" : "text-green-600"}`}>
                              {user.isBanned ? "Banned" : "Active"}
                            </span>
                            <span className={`text-xs font-medium ${user.verified ? "text-blue-600" : "text-slate-500"}`}>
                              {user.verified ? "Verified" : "Unverified"}
                            </span>
                            {user.flexiTime && (
                              <span className="text-xs font-medium text-violet-600">Flexi-time</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleBanToggle(user)}
                              disabled={actionLoadingId === user.id}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-white ${
                                user.isBanned ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                              }`}
                            >
                              {actionLoadingId === user.id ? <Loader className="w-3 h-3 animate-spin" /> : user.isBanned ? <ShieldCheck className="w-3 h-3" /> : <ShieldBan className="w-3 h-3" />}
                              {user.isBanned ? "Unban" : "Ban"}
                            </button>

                            <button
                              type="button"
                              onClick={() => runUserAction(user.id, "toggle-role")}
                              disabled={actionLoadingId === user.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-600 hover:bg-amber-700 text-white"
                              hidden={role !== "admin"}
                            >
                              <Users className="w-3 h-3" />
                              Next Role
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSetBiometricId(user)}
                              disabled={actionLoadingId === user.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              <Fingerprint className="w-3 h-3" />
                              Set Biometric ID
                            </button>

                            <button
                              type="button"
                              onClick={() => runUserAction(user.id, "flexi-time", { flexiTime: !user.flexiTime })}
                              disabled={actionLoadingId === user.id}
                              title="Late is based on the shift start time, with a 1-minute grace period."
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-white ${
                                user.flexiTime ? "bg-violet-700 hover:bg-violet-800" : "bg-slate-600 hover:bg-slate-700"
                              }`}
                            >
                              <Clock3 className="w-3 h-3" />
                              {user.flexiTime ? "Disable Flexi-time" : "Enable Flexi-time"}
                            </button>

                            <button
                              type="button"
                              onClick={() => runUserAction(user.id, "toggle-verify")}
                              disabled={actionLoadingId === user.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <BadgeCheck className="w-3 h-3" />
                              {user.verified ? "Unverify" : "Verify"}
                            </button>
                          </div>

                        </td>
                      </tr>
                    ))}
                    {paginatedUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className={`py-6 px-2 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                        >
                          No users match your current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!loadingUsers && filteredUsers.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Showing {(currentPage - 1) * rowsPerPage + 1}
                  -{Math.min(currentPage * rowsPerPage, filteredUsers.length)} of {filteredUsers.length}
                </p>

                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className={`px-3 py-2 rounded-lg border text-sm disabled:opacity-60 ${
                      isDarkMode
                        ? "border-slate-600 text-slate-200 hover:bg-slate-700"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Previous
                  </button>

                  <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className={`px-3 py-2 rounded-lg border text-sm disabled:opacity-60 ${
                      isDarkMode
                        ? "border-slate-600 text-slate-200 hover:bg-slate-700"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
