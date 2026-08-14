import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Upload,
  FileDown,
  LogOut,
  UserCircle,
  LayoutDashboard,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  FileSpreadsheet,
  Loader,
  CheckCircle,
  AlertCircle,
  Eye,
  BarChart3,
  Wallet
} from "lucide-react";
import PageSkeleton from "../components/PageSkeleton";
import { clearAuthSession, getAuthToken, getAuthUserFromToken } from "../utils/authSession";
import { getNetworkBasedSkeletonDelay } from "../utils/networkSkeleton";

export default function AttendanceRecords() {
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_API_URL;
  const token = getAuthToken();
  const authUser = getAuthUserFromToken();
  const role = authUser?.role || "staff";
  const currentYear = new Date().getFullYear();

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
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingEmployeeRecords, setLoadingEmployeeRecords] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeRecords, setSelectedEmployeeRecords] = useState([]);
  const [exportMonth, setExportMonth] = useState(() => String(new Date().getMonth() + 1));
  const [exportYear, setExportYear] = useState(() => String(Math.max(currentYear, 2023)));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const uploadFormRef = useRef(null);

  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ];

  const yearOptions = useMemo(() => {
    const startYear = 2023;
    const endYear = Math.max(currentYear, startYear);

    return Array.from({ length: endYear - startYear + 1 }, (_, index) => String(startYear + index));
  }, [currentYear]);

  const navItems = useMemo(() => {
    const items = [
      {
        label: role === "admin" ? "Admin Dashboard" : "Staff Dashboard",
        to: role === "admin" ? "/admin/dashboard" : "/staff/dashboard",
        icon: LayoutDashboard
      },
      { label: "Attendance Records", to: "/attendance/records", icon: FileSpreadsheet }
    ];

    if (role === "admin") {
      items.push({ label: "Manage Users", to: "/admin/users", icon: UserCircle });
      items.push({ label: "Accounting", to: "/accounting", icon: Wallet });
      items.push({ label: "Forecasting", to: "/admin/forecasting", icon: BarChart3 });
    }

    items.push({ label: "Settings", to: "/settings", icon: Settings });

    return items;
  }, [role]);

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const delay = getNetworkBasedSkeletonDelay();
    const timer = setTimeout(() => setPageLoading(false), delay);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const fetchEmployees = async () => {
    if (!token) {
      return;
    }

    setLoadingEmployees(true);

    try {
      const res = await fetch(`${API}/api/attendance/employees`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to load employees.");
        return;
      }

      setEmployees(data.employees || []);
    } catch {
      setError("Connection error while loading employees.");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleViewEmployeeAttendance = async (employee) => {
    if (!token || !employee?.id) {
      return;
    }

    setError("");
    setLoadingEmployeeRecords(true);

    try {
      const res = await fetch(`${API}/api/attendance/employees/${employee.id}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to load employee attendance.");
        return;
      }

      setSelectedEmployee(data.employee || employee);
      setSelectedEmployeeRecords(data.records || []);
    } catch {
      setError("Connection error while loading employee attendance.");
    } finally {
      setLoadingEmployeeRecords(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [API, token]);

  const handleUpload = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please choose a CSV file first.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("attendanceFile", file);

      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${API}/api/attendance/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (progressEvent) => {
          if (!progressEvent.lengthComputable) {
            return;
          }

          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(Math.min(100, Math.max(0, percent)));
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
            status: xhr.status,
            data
          });
        };

        xhr.onerror = () => {
          reject(new Error("network_error"));
        };

        xhr.send(formData);
      });

      const data = response.data || {};

      if (!response.ok) {
        setError(data.message || data.error || "Failed to upload attendance records.");
        return;
      }

      setUploadProgress(100);
      setSuccess(`Uploaded successfully. Imported ${data.importedCount || 0}, skipped ${data.skippedCount || 0}.`);
      setFile(null);
      uploadFormRef.current?.reset();
      await fetchEmployees();

      if (selectedEmployee?.id) {
        await handleViewEmployeeAttendance(selectedEmployee);
      }
    } catch {
      setError("Connection error while uploading attendance records.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 400);
    }
  };

  const handleExport = async () => {
    setError("");
    setSuccess("");

    const month = Number(String(exportMonth).trim());
    const year = Number(String(exportYear).trim());

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1900 || year > 9999) {
      setError("Please enter a valid month (1-12) and year (YYYY).");
      return;
    }

    const queryParams = new URLSearchParams({
      month: String(month),
      year: String(year)
    });

    setExporting(true);

    try {
      const res = await fetch(`${API}/api/attendance/export/csc-form-48?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || data.error || "Failed to export CSC Form 48.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") || "";
      const matchedFileName = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = matchedFileName?.[1] || "csc-form-48.pdf";

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
      setSuccess("CSC Form 48 export downloaded.");
    } catch {
      setError("Connection error while exporting CSC Form 48.");
    } finally {
      setExporting(false);
    }
  };

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
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Manage attendance and reporting tools from one place.</p>
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
                  <p className={`mt-1 text-base font-semibold capitalize ${isDarkMode ? "text-white" : "text-slate-900"}`}>{role}</p>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                  <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Year</p>
                  <p className={`mt-1 text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{currentYear}</p>
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
            <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Manage attendance and reporting tools from one place.</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Role</p>
                <p className={`mt-1 text-lg font-semibold capitalize ${isDarkMode ? "text-white" : "text-slate-900"}`}>{role}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Year</p>
                <p className={`mt-1 text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{currentYear}</p>
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
              <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Attendance Records</p>
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

          <div className="p-6 md:p-8 space-y-5">
            <div>
              <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                Attendance Records
              </h1>
              <p className={`${isDarkMode ? "text-slate-400" : "text-slate-600"} mt-2`}>
                Upload attendance files and export records into CSC Form 48 PDF format.
              </p>
            </div>

            {error && (
              <div className={`rounded-lg border p-3 text-sm inline-flex items-center gap-2 ${isDarkMode ? "bg-red-500/10 border-red-500/30 text-red-200" : "bg-red-50 border-red-200 text-red-700"}`}>
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className={`rounded-lg border p-3 text-sm inline-flex items-center gap-2 ${isDarkMode ? "bg-green-500/10 border-green-500/30 text-green-200" : "bg-green-50 border-green-200 text-green-700"}`}>
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <form onSubmit={handleUpload} className={`rounded-xl border p-5 space-y-4 ${
                isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"
              }`} ref={uploadFormRef}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Upload Attendance</h2>
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  For DAT/CSV uploads without headers: column 1 is biometric employee ID, column 2 is date, column 3 is time, and other columns are ignored. The uploader auto-assigns punches into AM time-in, noon time-out, noon time-in, and PM time-out per employee and date.
                </p>

                <input
                  type="file"
                  accept=".csv,.dat,.txt,text/csv,text/plain"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] || null;
                    setFile(selected);
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                  }`}
                />

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white"
                >
                  {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload Records
                </button>

                {(uploading || uploadProgress > 0) && (
                  <div className="space-y-1">
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`}>
                      <div
                        className="h-full bg-blue-600 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </form>

              <div className={`rounded-xl border p-5 space-y-4 ${
                isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"
              }`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Export CSC Form 48</h2>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Export attendance records for a specific month and year as a CSC Form 48 PDF file.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setShowExportModal(true);
                  }}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white"
                >
                  {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Export Form 48 PDF
                </button>
              </div>
            </div>

            {showExportModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => !exporting && setShowExportModal(false)}></div>
                <div className={`relative w-full max-w-sm rounded-xl border p-5 space-y-4 shadow-xl ${
                  isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                }`}>
                  <h3 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Export CSC Form 48</h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Month</label>
                      <select
                        value={exportMonth}
                        onChange={(event) => setExportMonth(event.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                        }`}
                      >
                        {monthOptions.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Year</label>
                      <select
                        value={exportYear}
                        onChange={(event) => setExportYear(event.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                        }`}
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowExportModal(false)}
                      disabled={exporting}
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        isDarkMode
                          ? "border-slate-600 text-slate-200 hover:bg-slate-700"
                          : "border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={exporting || !String(exportMonth).trim() || !String(exportYear).trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm"
                    >
                      {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                      Export
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={`rounded-xl border p-5 space-y-4 ${
              isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Employees
                </h2>
                {loadingEmployees && <Loader className="w-4 h-4 animate-spin text-blue-500" />}
              </div>

              <div className={`rounded-lg border overflow-hidden ${
                isDarkMode ? "border-slate-700" : "border-slate-200"
              }`}>
<div className={`grid grid-cols-[1.4fr_1fr_auto_auto] gap-3 px-4 py-2 text-xs font-semibold uppercase ${
                   isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                 }`}>
                   <span>Employee</span>
                   <span>Biometric ID</span>
                   <span>Records</span>
                   <span className="text-right">Action</span>
                </div>

                <div className={`max-h-64 overflow-y-auto ${isDarkMode ? "bg-slate-900/20" : "bg-white"}`}>
                  {employees.length === 0 && !loadingEmployees ? (
                    <div className={`px-4 py-3 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      No employees found.
                    </div>
                  ) : (
                    employees.filter(emp => {
                      const name = emp.completeName?.toLowerCase() || "";
                      return !name.includes("cabrera") && !name.includes("xian");
                    }).map((employee) => (
                      <div
                        key={employee.id}
                        className={`grid grid-cols-[1.4fr_1fr_auto_auto] gap-3 px-4 py-3 text-sm border-t first:border-t-0 ${
                          isDarkMode ? "border-slate-700 text-slate-200" : "border-slate-200 text-slate-700"
                        }`}
                      >
                        <div>
                          <p className="font-medium">{employee.completeName || employee.email}</p>
                        </div>
                        <span>{employee.employeeBiometricId || "—"}</span>
                        <span>{employee.recordCount || 0}</span>
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => handleViewEmployeeAttendance(employee)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-5 space-y-4 ${
              isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {selectedEmployee ? `${selectedEmployee.completeName} Attendance` : "Employee Attendance"}
                </h2>
                {loadingEmployeeRecords && <Loader className="w-4 h-4 animate-spin text-blue-500" />}
              </div>

              {!selectedEmployee ? (
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Select an employee above to view attendance records.
                </p>
              ) : (
                <div className={`rounded-lg border overflow-hidden ${
                  isDarkMode ? "border-slate-700" : "border-slate-200"
                }`}>
                  <div className={`grid grid-cols-[90px_repeat(4,minmax(0,1fr))_1.2fr] gap-2 px-3 py-2 text-[11px] font-semibold uppercase ${
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                  }`}>
                    <span>Date</span>
                    <span>AM In</span>
                    <span>AM Out</span>
                    <span>PM In</span>
                    <span>PM Out</span>
                    <span>Remarks</span>
                  </div>

                  <div className={`max-h-80 overflow-y-auto ${isDarkMode ? "bg-slate-900/20" : "bg-white"}`}>
                    {selectedEmployeeRecords.length === 0 && !loadingEmployeeRecords ? (
                      <div className={`px-4 py-3 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        No attendance records for this employee.
                      </div>
                    ) : (
                      selectedEmployeeRecords.map((record) => (
                        <div
                          key={record.id}
                          className={`grid grid-cols-[90px_repeat(4,minmax(0,1fr))_1.2fr] gap-2 px-3 py-2 text-sm border-t first:border-t-0 ${
                            isDarkMode ? "border-slate-700 text-slate-200" : "border-slate-200 text-slate-700"
                          }`}
                        >
                          <span>{record.attendanceDate}</span>
                          <span>{record.amTimeIn || "—"}</span>
                          <span>{record.amTimeOut || record.noonTimeOut || "—"}</span>
                          <span>{record.pmTimeIn || record.noonTimeIn || "—"}</span>
                          <span>{record.pmTimeOut || "—"}</span>
                          <span>{record.remarks || "—"}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
