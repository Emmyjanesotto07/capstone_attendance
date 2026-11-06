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
  Wallet,
  BrainCircuit,
  Search
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
  const [cscPreviewUrl, setCscPreviewUrl] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeRecords, setSelectedEmployeeRecords] = useState([]);
  const [selectedEmployeeInsight, setSelectedEmployeeInsight] = useState(null);
  const [exportMonth, setExportMonth] = useState(() => String(new Date().getMonth() + 1));
  const [exportYear, setExportYear] = useState(() => String(Math.max(currentYear, 2023)));
  const [employeeSearch, setEmployeeSearch] = useState("");
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
      setSelectedEmployeeInsight(data.aiInsight || null);
    } catch {
      setError("Connection error while loading employee attendance.");
    } finally {
      setLoadingEmployeeRecords(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [API, token]);

  useEffect(() => {
    return () => {
      if (cscPreviewUrl) {
        window.URL.revokeObjectURL(cscPreviewUrl);
      }
    };
  }, [cscPreviewUrl]);

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();

    if (!query) {
      return employees;
    }

    return employees.filter((employee) => {
      const displayName = String(
        employee?.completeName ||
          employee?.CompleteName ||
          employee?.employeeName ||
          employee?.name ||
          employee?.email ||
          ""
      ).toLowerCase();
      const biometricId = String(employee?.employeeBiometricId || employee?.biometricId || "").toLowerCase();
      const email = String(employee?.email || "").toLowerCase();

      return displayName.includes(query) || biometricId.includes(query) || email.includes(query);
    });
  }, [employeeSearch, employees]);

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
      setSuccess(`Uploaded successfully. Imported ${data.insertedCount ?? data.importedCount ?? 0}, updated ${data.updatedCount || 0}, already existed ${data.duplicateCount || 0}, skipped ${data.skippedCount || 0}.`);
      setFile(null);
      uploadFormRef.current?.reset();
      window.dispatchEvent(new CustomEvent("attendance-data-updated"));
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
      setCscPreviewUrl(url);
      const link = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") || "";
      const matchedFileName = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = matchedFileName?.[1] || "csc-form-48.pdf";

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

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

  const possibleTimeTheftCount = selectedEmployeeRecords.filter((record) =>
    record.possibleTimeTheftReview?.flagged
  ).length;

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

        <main className="min-w-0 flex-1">
          <div className="p-6 md:p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${isDarkMode ? "bg-blue-950 text-blue-300" : "bg-blue-50 text-blue-600"}`}>
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h1 className={`text-[2rem] font-bold tracking-[-0.04em] ${isDarkMode ? "text-white" : "text-slate-800"}`}>Attendance Records</h1>
                <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Upload attendance files and export records into CSC Form 48 PDF format.</p>
              </div>
            </div>

            {error && (
              <div className={`mb-5 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${isDarkMode ? "border-red-900 bg-red-950/50 text-red-200" : "border-red-200 bg-red-50 text-red-700"}`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className={isDarkMode ? "text-red-300 transition hover:text-white" : "text-red-700 transition hover:text-red-900"}
                  aria-label="Dismiss message"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {success && (
              <div className={`mb-5 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${isDarkMode ? "border-emerald-900 bg-emerald-950/50 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {success}
                </div>
                <button
                  type="button"
                  onClick={() => setSuccess("")}
                  className={isDarkMode ? "text-emerald-300 transition hover:text-white" : "text-emerald-700 transition hover:text-emerald-900"}
                  aria-label="Dismiss message"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="grid gap-5 xl:grid-cols-2">
              <form onSubmit={handleUpload} ref={uploadFormRef} className={`rounded-[26px] border p-5 shadow-sm md:p-6 ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
                <div className="mb-4 flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDarkMode ? "bg-blue-950 text-blue-300" : "bg-blue-50 text-blue-600"}`}>
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className={`text-[1.1rem] font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Upload Attendance</h2>
                    <p className={`mt-1 text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                      For DAT/CSV uploads without headers: column 1 is biometric employee ID, column 2 is date, column 3 is time, and other columns are ignored. The uploader auto-assigns punches into AM time-in, noon time-out, noon time-in, and PM time-out per employee and date.
                    </p>
                  </div>
                </div>

                <label className={`mt-4 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${isDarkMode ? "border-blue-800 bg-blue-950/30 hover:border-blue-600 hover:bg-blue-950/50" : "border-blue-200 bg-blue-50/40 hover:border-blue-300 hover:bg-blue-50"}`}>
                  <input
                    type="file"
                    accept=".csv,.dat,.txt,text/csv,text/plain"
                    className="hidden"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] || null;
                      setFile(selected);
                    }}
                  />
                  <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full shadow-sm ${isDarkMode ? "bg-slate-800 text-blue-300" : "bg-white text-blue-600"}`}>
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}>{file ? file.name : "Choose File No file chosen"}</p>
                  <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Drag and drop a file or click to browse</p>
                </label>

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Records
                </button>

                {(uploading || uploadProgress > 0) && (
                  <div className="mt-4 space-y-2">
                    <div className={`h-2.5 w-full overflow-hidden rounded-full ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`}>
                      <div className="h-full rounded-full bg-blue-600 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Uploading... {uploadProgress}%</p>
                  </div>
                )}
              </form>

              <div className={`rounded-[26px] border p-5 shadow-sm md:p-6 ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
                <div className="mb-4 flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDarkMode ? "bg-emerald-950 text-emerald-300" : "bg-emerald-50 text-emerald-600"}`}>
                    <FileDown className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className={`text-[1.1rem] font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Export CSC Form 48</h2>
                    <p className={`mt-1 text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                      Export attendance records for a specific month and year as a CSC Form 48 PDF file.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setShowExportModal(true);
                  }}
                  disabled={exporting}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exporting ? <Loader className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Export Form 48 PDF
                </button>

                <div className={`mt-6 flex items-center justify-center rounded-[22px] p-6 ${isDarkMode ? "bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900" : "bg-gradient-to-br from-emerald-50 via-white to-emerald-100"}`}>
                  <div className={`relative h-28 w-28 rounded-2xl shadow-sm ring-1 ${isDarkMode ? "bg-slate-800 ring-slate-700" : "bg-white ring-slate-200"}`}>
                    <div className={`absolute inset-0 rounded-2xl ${isDarkMode ? "bg-slate-700/40" : "bg-slate-50/60"}`} />
                    <div className={`absolute inset-4 rounded-xl border border-dashed ${isDarkMode ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"}`} />
                    <div className={`absolute inset-x-5 bottom-4 flex items-center justify-between rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] shadow-sm ring-1 ${isDarkMode ? "bg-slate-800 text-slate-300 ring-slate-600" : "bg-white text-slate-500 ring-slate-200"}`}>
                      <span>PDF</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <FileDown className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-6 rounded-[26px] border p-5 shadow-sm md:p-6 ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDarkMode ? "bg-blue-950 text-blue-300" : "bg-blue-50 text-blue-600"}`}>
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <h2 className={`text-[1.2rem] font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Employees</h2>
                </div>

                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder="Search employee..."
                    className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none transition ${isDarkMode ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500" : "border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"}`}
                  />
                </div>
              </div>

              <div className={`overflow-hidden rounded-2xl border ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                <div className={`grid grid-cols-[1.8fr_1.2fr_0.8fr_0.9fr] gap-4 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                  <span>Employee</span>
                  <span>Biometric ID</span>
                  <span>Records</span>
                  <span className="text-right">Action</span>
                </div>

                {filteredEmployees.length === 0 ? (
                  <div className={`px-4 py-4 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No employees found.</div>
                ) : (
                  filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className={`grid grid-cols-[1.8fr_1.2fr_0.8fr_0.9fr] items-center gap-4 border-t px-4 py-3 text-sm ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-white text-slate-700"}`}
                    >
                      <div className={`font-medium ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                        {employee.completeName || employee.CompleteName || employee.employeeName || employee.name || employee.email || "Employee"}
                      </div>
                      <div>{employee.employeeBiometricId || employee.biometricId || "—"}</div>
                      <div>{employee.recordCount || 0}</div>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => handleViewEmployeeAttendance(employee)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedEmployee && (
              <div className={`mt-6 rounded-[26px] border p-5 shadow-sm md:p-6 ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className={`text-[1.2rem] font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                    {selectedEmployee.completeName || selectedEmployee.CompleteName || selectedEmployee.employeeName || selectedEmployee.name || "Employee"} Attendance
                  </h2>
                  {loadingEmployeeRecords && <Loader className="h-4 w-4 animate-spin text-blue-500" />}
                </div>

                {selectedEmployeeInsight && (
                  <div className={`mb-4 rounded-2xl border p-4 ${
                    selectedEmployeeInsight.severity === "high"
                      ? "border-red-200 bg-red-50"
                      : selectedEmployeeInsight.severity === "medium"
                        ? "border-amber-200 bg-amber-50"
                        : "border-emerald-200 bg-emerald-50"
                  }`}>
                    <div className="flex items-start gap-3">
                      <BrainCircuit className={`mt-0.5 h-5 w-5 ${selectedEmployeeInsight.severity === "high" ? "text-red-500" : selectedEmployeeInsight.severity === "medium" ? "text-amber-500" : "text-emerald-500"}`} />
                      <div>
                        <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                          AI Attendance Insight: <span className="capitalize">{selectedEmployeeInsight.severity}</span> risk ({selectedEmployeeInsight.score || 0}/100)
                        </p>
                        <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{selectedEmployeeInsight.reason || "No anomaly details available."}</p>
                      </div>
                    </div>
                  </div>
                )}

                {possibleTimeTheftCount > 0 && (
                  <div className={`mb-4 rounded-2xl border p-4 ${isDarkMode ? "border-amber-800 bg-amber-950/40" : "border-amber-300 bg-amber-50"}`} role="status">
                    <p className={`text-sm font-semibold ${isDarkMode ? "text-amber-200" : "text-amber-900"}`}>
                      Possible time-theft indicators on {possibleTimeTheftCount} attendance {possibleTimeTheftCount === 1 ? "record" : "records"}
                    </p>
                    <p className={`mt-1 text-sm ${isDarkMode ? "text-amber-300" : "text-amber-800"}`}>
                      These are review signals, not proof of misconduct. Verify the biometric source records and context before taking action.
                    </p>
                  </div>
                )}

                <div className={`overflow-x-auto rounded-2xl border ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                  <div className={`grid min-w-[1100px] grid-cols-[90px_repeat(4,minmax(0,1fr))_1.2fr_1.6fr] gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                    <span>Date</span>
                    <span>AM In</span>
                    <span>AM Out</span>
                    <span>PM In</span>
                    <span>PM Out</span>
                    <span>Remarks</span>
                    <span>Possible time theft</span>
                  </div>

                  <div className={`max-h-80 overflow-y-auto ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
                    {selectedEmployeeRecords.length === 0 && !loadingEmployeeRecords ? (
                      <div className={`px-4 py-3 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No attendance records for this employee.</div>
                    ) : (
                      selectedEmployeeRecords.map((record) => (
                        <div key={record.id} className={`grid min-w-[1100px] grid-cols-[90px_repeat(4,minmax(0,1fr))_1.2fr_1.6fr] gap-2 border-t px-3 py-2 text-sm ${isDarkMode ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-700"}`}>
                          <span>{record.attendanceDate || "—"}</span>
                          <span>{record.amTimeIn || "—"}</span>
                          <span>{record.amTimeOut || record.noonTimeOut || "—"}</span>
                          <span>{record.pmTimeIn || record.noonTimeIn || "—"}</span>
                          <span>{record.pmTimeOut || "—"}</span>
                          <span>{record.remarks || "—"}</span>
                          <span className="space-y-1">
                            {record.possibleTimeTheftReview?.flagged ? (
                              <>
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                  Review required
                                </span>
                                {record.possibleTimeTheftReview.reasons.map((reason) => (
                                  <span key={reason} className="block text-xs leading-5 text-amber-800">
                                    {reason}
                                  </span>
                                ))}
                              </>
                            ) : (
                              <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No indicators</span>
                            )}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {showExportModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget && !exporting) {
                setShowExportModal(false);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="export-form-48-title"
              className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDarkMode ? "bg-slate-900 ring-1 ring-slate-700" : "bg-white"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="export-form-48-title" className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                    Export CSC Form 48
                  </h2>
                  <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Choose the month and year for the attendance PDF.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  disabled={exporting}
                  className={`rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}
                  aria-label="Close export dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                  Month
                  <select
                    value={exportMonth}
                    onChange={(event) => setExportMonth(event.target.value)}
                    className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${isDarkMode ? "border-slate-700 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-800"}`}
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                  Year
                  <select
                    value={exportYear}
                    onChange={(event) => setExportYear(event.target.value)}
                    className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${isDarkMode ? "border-slate-700 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-800"}`}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error && (
                <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${isDarkMode ? "border-red-900 bg-red-950/50 text-red-200" : "border-red-200 bg-red-50 text-red-700"}`} role="alert">
                  {error}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  disabled={exporting}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exporting ? <Loader className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  {exporting ? "Exporting..." : "Download PDF"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
