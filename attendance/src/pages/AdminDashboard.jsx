import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, BadgeCheck, FileSpreadsheet, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Sun, Moon, UserCircle, Users, Wallet, X } from "lucide-react";
import PageSkeleton from "../components/PageSkeleton";
import { clearAuthSession, getAuthToken, getAuthUserFromToken } from "../utils/authSession";
import { getNetworkBasedSkeletonDelay } from "../utils/networkSkeleton";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [onTimeCount, setOnTimeCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [recentAttendees, setRecentAttendees] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);

  const authUser = getAuthUserFromToken();
  const email = authUser?.email || "admin@minsu.edu.ph";

  const navItems = [
    { label: "Admin Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Attendance Records", to: "/attendance/records", icon: FileSpreadsheet },
    { label: "Accounting", to: "/accounting", icon: Wallet },
    { label: "Forecasting", to: "/admin/forecasting", icon: BarChart3 },
    { label: "Manage Users", to: "/admin/users", icon: Users },
    { label: "Settings", to: "/settings", icon: Settings }
  ];

  const quickActions = [
    {
      label: "Review Users",
      description: "Maintain access and roles for the system",
      to: "/admin/users",
      icon: Users,
      accent: "emerald"
    },
    {
      label: "Open Forecasting",
      description: "See the planning workspace and projections",
      to: "/admin/forecasting",
      icon: BarChart3,
      accent: "amber"
    },
    {
      label: "Check Accounting",
      description: "Move straight to accounting records and review",
      to: "/accounting",
      icon: Wallet,
      accent: "slate"
    }
  ];

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
    let cancelled = false;

    const toMinutes = (timeText) => {
      if (!timeText) return null;
      const parts = String(timeText).split(":");
      if (parts.length < 2) return null;
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
      return h * 60 + m;
    };

    const detectLateSample = async (presentUsers) => {
      const sample = presentUsers.slice(0, 8);
      let checked = 0;
      let lateDetected = 0;

      for (const u of sample) {
        try {
          const token = getAuthToken();
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/employees/${u.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!res.ok) continue;
          const data = await res.json();
          const recordToday = (data.records || []).find((r) => String(r.attendanceDate || "").slice(0, 10) === new Date().toISOString().slice(0, 10));

          if (!recordToday) continue;

          const timeText = recordToday.amTimeIn || recordToday.timeIn || recordToday.pmTimeIn || null;
          const minutes = toMinutes(timeText);
          if (minutes !== null) {
            checked += 1;
            // threshold 8:15am => 495 minutes
            if (minutes > 495) {
              lateDetected += 1;
            }
          }
        } catch (err) {
        }
      }

      return checked > 0 ? lateDetected / checked : 0;
    };

    const fetchAttendanceOverview = async () => {
      setAttendanceLoading(true);

      try {
        const token = getAuthToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/employees`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          setAttendanceLoading(false);
          return;
        }

        const data = await res.json();
        const employees = Array.isArray(data.employees) ? data.employees : [];

        if (cancelled) return;

        const today = new Date().toISOString().slice(0, 10);
        const present = employees.filter((e) => String(e.latestAttendanceDate || "").slice(0, 10) === today);
        const total = employees.length;
        const presentCount = present.length;

        const lateRatio = await detectLateSample(present);

        const approxLate = Math.round(presentCount * lateRatio);

        setTotalEmployees(total);
        setOnTimeCount(Math.max(0, presentCount - approxLate));
        setLateCount(approxLate);
        setAbsentCount(Math.max(0, total - presentCount));

        // Calculate monthly stats for last 6 months
        const monthlyMap = {};
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
          monthlyMap[monthKey] = { total: 0, present: 0, ontime: 0, late: 0, absent: 0 };
        }

        employees.forEach((emp) => {
          const latestDate = String(emp.latestAttendanceDate || "").slice(0, 10);
          if (!latestDate) return;

          const monthKey = latestDate.slice(0, 7);
          if (monthKey in monthlyMap) {
            monthlyMap[monthKey].total += 1;
            monthlyMap[monthKey].present += 1;
            // For now assume on-time (without detailed time data)
            monthlyMap[monthKey].ontime += 1;
          }
        });

        // Calculate absent and late for each month
        Object.keys(monthlyMap).forEach((month) => {
          const totalEmployees = employees.length;
          monthlyMap[month].total = totalEmployees;
          monthlyMap[month].absent = totalEmployees - monthlyMap[month].present;
          // Estimate late as portion of present (using sampled ratio)
          const estimatedLate = Math.round(monthlyMap[month].present * lateRatio);
          monthlyMap[month].late = estimatedLate;
          monthlyMap[month].ontime = monthlyMap[month].present - estimatedLate;
        });

        const stats = Object.entries(monthlyMap).map(([month, data]) => {
          const onTimePercent = data.total > 0 ? Math.round((data.ontime / data.total) * 100) : 0;
          const latePercent = data.total > 0 ? Math.round((data.late / data.total) * 100) : 0;
          const absentPercent = data.total > 0 ? Math.round((data.absent / data.total) * 100) : 0;
          return {
            month: month.slice(5), // MM only
            onTimePercent,
            latePercent,
            absentPercent,
            present: data.present,
            absent: data.absent,
            total: data.total
          };
        });

        setMonthlyStats(stats);
      } catch (err) {
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    };

    fetchAttendanceOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  if (pageLoading) {
    return <PageSkeleton dark={isDarkMode} type="dashboard" />;
  }

  const shellClass = isDarkMode
    ? "bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(250,204,21,0.12),_transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]"
    : "bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.18),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]";
  const panelClass = isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-slate-200";
  const surfaceClass = isDarkMode ? "bg-slate-900/90 border-slate-700/80" : "bg-white/80 border-white/70";
  const strongClass = isDarkMode ? "text-white" : "text-slate-900";
  const mutedClass = isDarkMode ? "text-slate-400" : "text-slate-600";
  const chipClass = isDarkMode ? "bg-slate-700/70 text-slate-200 border-slate-600" : "bg-slate-100 text-slate-700 border-slate-200";
  const sidebarShellClass = isDarkMode
    ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,0.88)_100%)]"
    : "bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(248,250,252,0.9)_100%)]";
  const navBaseClass = `group relative inline-flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium transition-all duration-200`;
  const navInactiveClass = isDarkMode
    ? "border-transparent text-slate-200 hover:border-emerald-500/20 hover:bg-slate-700/70"
    : "border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/70";
  const navActiveClass = "border-emerald-500/30 bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-600/25";
  const logoutClass = isDarkMode
    ? "bg-slate-950/80 text-white hover:bg-slate-900 border-slate-800"
    : "bg-slate-900 text-white hover:bg-slate-800 border-slate-900";

  return (
    <div className={`relative min-h-screen overflow-hidden p-3 md:p-4 transition-colors duration-300 ${shellClass}`}>
      <div className={`pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full blur-3xl ${isDarkMode ? "bg-emerald-500/10" : "bg-emerald-300/20"}`}></div>
      <div className={`pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full blur-3xl ${isDarkMode ? "bg-amber-500/10" : "bg-amber-300/20"}`}></div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>

          <aside className={`absolute left-0 top-0 h-full w-80 border-r shadow-2xl overflow-hidden backdrop-blur-xl ${panelClass} ${sidebarShellClass}`}>
            <div className="flex h-full flex-col p-5">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-4 text-white shadow-lg shadow-emerald-900/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-100/90">Workspace</p>
                    <h2 className="mt-1 text-xl font-bold">Admin Menu</h2>
                    <p className="mt-2 text-xs leading-5 text-emerald-100/90">Manage users and system tools from one place.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="rounded-xl border border-white/15 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/80">Role</p>
                    <p className="mt-1 text-2xl font-bold">Admin</p>
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                  MUNICIPAL CONTROL PANEL
                </div>
              </div>

              <div
                className={`mt-4 rounded-3xl border px-4 py-3 text-sm shadow-sm ${
                  isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/70"
                }`}
              >
                <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${mutedClass}`}>Signed in as</p>
                <p className={`mt-1 break-all text-sm font-medium ${strongClass}`}>{email}</p>
              </div>

              <nav className="mt-6 flex-1 space-y-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`${navBaseClass} ${isActive ? navActiveClass : navInactiveClass}`}
                    >
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? "bg-white/15" : isDarkMode ? "bg-slate-700/70" : "bg-white shadow-sm"}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <button
                type="button"
                onClick={handleLogout}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 ${logoutClass}`}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-[280px_1fr] md:gap-5">
        <aside className={`hidden h-fit overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-xl md:block ${panelClass} ${sidebarShellClass}`}>
          <div className="p-5">
            <div className="rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/20">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-100/90">Workspace</p>
              <h2 className="mt-1 text-2xl font-bold">Admin Menu</h2>
              <p className="mt-2 text-sm leading-6 text-emerald-100/90">Manage users and system tools from one place.</p>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/80">Role</p>
                  <p className="mt-1 text-2xl font-bold">Admin</p>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-200" />
                Active session
              </div>

              <p className="mt-4 break-all text-sm text-emerald-100/90">{email}</p>
            </div>

            <nav className="mt-5 space-y-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`${navBaseClass} ${isActive ? navActiveClass : navInactiveClass}`}
                  >
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? "bg-white/15" : isDarkMode ? "bg-slate-700/70" : "bg-white shadow-sm"}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 ${logoutClass}`}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </aside>

        <main className={`overflow-hidden rounded-[1.75rem] border shadow-2xl backdrop-blur-xl ${surfaceClass}`}>
          <div className={`relative flex items-center justify-between border-b px-5 py-4 md:px-6 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/60"}`}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className={`inline-flex items-center justify-center rounded-lg border p-2 md:hidden ${isDarkMode ? "border-slate-600 bg-slate-700 text-slate-200" : "border-slate-300 bg-white text-slate-700"}`}
              >
                <Menu className="w-4 h-4" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-500">HRMO</p>
                <p className={`text-base font-semibold ${strongClass}`}>Admin Panel</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${isDarkMode ? "border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDarkMode ? "Light" : "Dark"}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${isDarkMode ? "border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                >
                  <UserCircle className="w-4 h-4" />
                  User
                </button>

                {showUserMenu && (
                  <div className={`absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl ${isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
                    <Link
                      to="/settings"
                      className={`inline-flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${isDarkMode ? "text-slate-200 hover:bg-slate-700" : "text-slate-700 hover:bg-slate-100"}`}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={`inline-flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${isDarkMode ? "text-red-300 hover:bg-slate-700" : "text-red-600 hover:bg-slate-100"}`}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 p-5 md:p-8">
            
            <section className={`rounded-[1.35rem] border p-4 md:p-6 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/80"}`}>
              <h3 className={`text-lg font-semibold ${strongClass}`}>Employee Attendance Dashboard</h3>
              <p className={`text-sm ${mutedClass}`}>Quick overview of employee attendance and recent activity.</p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg p-4 text-white bg-sky-500">
                  <p className="text-sm opacity-90">Total Employees</p>
                  <p className="mt-2 text-2xl font-bold">{attendanceLoading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-white/30" /> : totalEmployees}</p>
                </div>
                <div className="rounded-lg p-4 text-white bg-emerald-500">
                  <p className="text-sm opacity-90">On-Time</p>
                  <p className="mt-2 text-2xl font-bold">{attendanceLoading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-white/30" /> : onTimeCount}</p>
                </div>
                <div className="rounded-lg p-4 text-white bg-red-500">
                  <p className="text-sm opacity-90">Late</p>
                  <p className="mt-2 text-2xl font-bold">{attendanceLoading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-white/30" /> : lateCount}</p>
                </div>
                <div className="rounded-lg p-4 text-white bg-amber-500">
                  <p className="text-sm opacity-90">Absent</p>
                  <p className="mt-2 text-2xl font-bold">{attendanceLoading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-white/30" /> : absentCount}</p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border p-6 bg-transparent">
                <p className={`text-sm font-semibold ${mutedClass} mb-4`}>ATTENDANCE</p>
                <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
                  {/* Donut Chart */}
                  <div className="flex-1 flex justify-center">
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {attendanceLoading ? (
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" opacity="0.3" />
                        ) : (
                          <>
                            {/* Present (Green) */}
                            {onTimeCount > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="12"
                                strokeDasharray={`${(onTimeCount / totalEmployees) * 251.2} 251.2`}
                                strokeLinecap="round"
                              />
                            )}
                            {/* Late (Orange) */}
                            {lateCount > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#f97316"
                                strokeWidth="12"
                                strokeDasharray={`${(lateCount / totalEmployees) * 251.2} 251.2`}
                                strokeDashoffset={`-${(onTimeCount / totalEmployees) * 251.2}`}
                                strokeLinecap="round"
                              />
                            )}
                            {/* Absent (Red) */}
                            {absentCount > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="12"
                                strokeDasharray={`${(absentCount / totalEmployees) * 251.2} 251.2`}
                                strokeDashoffset={`-${((onTimeCount + lateCount) / totalEmployees) * 251.2}`}
                                strokeLinecap="round"
                              />
                            )}
                          </>
                        )}
                      </svg>
                      {/* Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className={`text-2xl font-bold ${strongClass}`}>{onTimeCount + lateCount}/{totalEmployees}</p>
                        <p className={`text-xs ${mutedClass}`}>Present</p>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-emerald-500"></div>
                        <p className={`text-sm font-medium ${strongClass}`}>Present</p>
                      </div>
                      <p className={`text-sm ${mutedClass}`}>{onTimeCount} ({totalEmployees > 0 ? Math.round((onTimeCount / totalEmployees) * 100) : 0}%)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-orange-500"></div>
                        <p className={`text-sm font-medium ${strongClass}`}>Late</p>
                      </div>
                      <p className={`text-sm ${mutedClass}`}>{lateCount} ({totalEmployees > 0 ? Math.round((lateCount / totalEmployees) * 100) : 0}%)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500"></div>
                        <p className={`text-sm font-medium ${strongClass}`}>Absent</p>
                      </div>
                      <p className={`text-sm ${mutedClass}`}>{absentCount} ({totalEmployees > 0 ? Math.round((absentCount / totalEmployees) * 100) : 0}%)</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
