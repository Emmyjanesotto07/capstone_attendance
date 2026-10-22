import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, AlertTriangle, BarChart3, BadgeCheck, BriefcaseBusiness, Clock3, FileSpreadsheet, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Sun, Moon, UserCircle, Users, Wallet, X } from "lucide-react";
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
  const [presentCount, setPresentCount] = useState(0);
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

    const countLateEmployees = async (presentUsers, attendanceDate) => {
      const lateResults = await Promise.all(presentUsers.map(async (employee) => {
        try {
          const token = getAuthToken();
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/employees/${employee.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!res.ok) return false;

          const data = await res.json();
          const record = (data.records || []).find((item) => String(item.attendanceDate || "").slice(0, 10) === attendanceDate);

          if (!record) return false;

          const remarks = String(record.remarks || "").toLowerCase();
          const timeText = record.amTimeIn || record.timeIn || record.pmTimeIn || null;
          const minutes = toMinutes(timeText);

          return remarks.includes("late") || (minutes !== null && minutes > 495);
        } catch {
          return false;
        }
      }));

      return lateResults.filter(Boolean).length;
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

        const latestAttendanceDate = employees
          .map((employee) => String(employee.latestAttendanceDate || "").slice(0, 10))
          .filter(Boolean)
          .sort()
          .at(-1);
        const present = latestAttendanceDate
          ? employees.filter((employee) => String(employee.latestAttendanceDate || "").slice(0, 10) === latestAttendanceDate)
          : [];
        const total = employees.length;
        const presentCount = present.length;

        const lateCount = latestAttendanceDate ? await countLateEmployees(present, latestAttendanceDate) : 0;
        const lateRatio = presentCount > 0 ? lateCount / presentCount : 0;

        setTotalEmployees(total);
        setPresentCount(presentCount);
        setOnTimeCount(Math.max(0, presentCount - lateCount));
        setLateCount(lateCount);
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

        Object.keys(monthlyMap).forEach((month) => {
          const totalEmployees = employees.length;
          monthlyMap[month].total = totalEmployees;
          monthlyMap[month].absent = totalEmployees - monthlyMap[month].present;
          const estimatedLate = Math.round(monthlyMap[month].present * lateRatio);
          monthlyMap[month].late = estimatedLate;
          monthlyMap[month].ontime = monthlyMap[month].present - estimatedLate;
        });

        const stats = Object.entries(monthlyMap).map(([month, data]) => {
          const onTimePercent = data.total > 0 ? Math.round((data.ontime / data.total) * 100) : 0;
          const latePercent = data.total > 0 ? Math.round((data.late / data.total) * 100) : 0;
          const absentPercent = data.total > 0 ? Math.round((data.absent / data.total) * 100) : 0;
          return {
            month: month.slice(5),
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

    const handleAttendanceUpdate = () => {
      fetchAttendanceOverview();
    };

    fetchAttendanceOverview();
    window.addEventListener("attendance-data-updated", handleAttendanceUpdate);
    const refreshTimer = setInterval(fetchAttendanceOverview, 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener("attendance-data-updated", handleAttendanceUpdate);
      clearInterval(refreshTimer);
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
  const onTimePercent = totalEmployees > 0 ? Math.round((onTimeCount / totalEmployees) * 100) : 0;
  const absentPercent = totalEmployees > 0 ? Math.round((absentCount / totalEmployees) * 100) : 0;
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
  const onTimeRingStyle = {
    background: `conic-gradient(#10b981 ${onTimePercent}%, ${isDarkMode ? "#334155" : "#e2e8f0"} 0)`
  };
  const absentRingStyle = {
    background: `conic-gradient(#ef4444 ${absentPercent}%, ${isDarkMode ? "#334155" : "#e2e8f0"} 0)`
  };

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
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className={`rounded-[1.35rem] border p-4 ${isDarkMode ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-100 bg-emerald-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Total employees</p>
                <p className={`mt-2 text-2xl font-bold ${strongClass}`}>{attendanceLoading ? "--" : totalEmployees}</p>
              </div>
              <div className={`rounded-[1.35rem] border p-4 ${isDarkMode ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-100 bg-emerald-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Present</p>
                <p className={`mt-2 text-2xl font-bold ${strongClass}`}>{attendanceLoading ? "--" : presentCount}</p>
              </div>
              <div className={`rounded-[1.35rem] border p-4 ${isDarkMode ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-100 bg-emerald-50"}`}>
                <p className={`text-sm ${mutedClass}`}>On-time</p>
                <p className={`mt-2 text-2xl font-bold ${strongClass}`}>{attendanceLoading ? "--" : onTimeCount}</p>
              </div>
              <div className={`rounded-[1.35rem] border p-4 ${isDarkMode ? "border-amber-500/30 bg-amber-500/10" : "border-amber-100 bg-amber-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Late</p>
                <p className={`mt-2 text-2xl font-bold ${strongClass}`}>{attendanceLoading ? "--" : lateCount}</p>
              </div>
              <div className={`rounded-[1.35rem] border p-4 ${isDarkMode ? "border-red-500/30 bg-red-500/10" : "border-red-100 bg-red-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Absent</p>
                <p className={`mt-2 text-2xl font-bold ${strongClass}`}>{attendanceLoading ? "--" : absentCount}</p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className={`rounded-[1.35rem] border p-5 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Current role</p>
                <p className={`mt-1 text-lg font-semibold ${strongClass}`}>ADMIN</p>
                <p className={`mt-3 text-sm ${mutedClass}`}>Signed in as</p>
                <p className={`mt-1 inline-flex items-center gap-2 text-base font-semibold ${strongClass}`}><UserCircle className="h-5 w-5 text-emerald-500" />{email}</p>
                <p className={`mt-4 inline-flex items-center gap-2 text-xs font-semibold ${mutedClass}`}><BadgeCheck className="h-4 w-4 text-emerald-500" />{monthLabel}</p>
              </div>
              <div className={`rounded-[1.35rem] border p-5 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between"><p className={`text-sm font-semibold ${strongClass}`}>On-time %</p><Clock3 className="h-5 w-5 text-emerald-500" /></div>
                <div className="mt-4 flex items-center gap-4"><div className="relative grid h-24 w-24 place-items-center rounded-full" style={onTimeRingStyle}><div className={`grid h-16 w-16 place-items-center rounded-full ${isDarkMode ? "bg-slate-900" : "bg-white"}`}><span className={`text-sm font-bold ${strongClass}`}>{attendanceLoading ? "--" : `${onTimePercent}%`}</span></div></div><div><p className={`text-sm ${mutedClass}`}>Employees on time</p><p className={`text-xl font-bold ${strongClass}`}>{attendanceLoading ? "--" : onTimeCount}</p></div></div>
              </div>
              <div className={`rounded-[1.35rem] border p-5 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between"><p className={`text-sm font-semibold ${strongClass}`}>Absent %</p><AlertTriangle className="h-5 w-5 text-red-500" /></div>
                <div className="mt-4 flex items-center gap-4"><div className="relative grid h-24 w-24 place-items-center rounded-full" style={absentRingStyle}><div className={`grid h-16 w-16 place-items-center rounded-full ${isDarkMode ? "bg-slate-900" : "bg-white"}`}><span className={`text-sm font-bold ${strongClass}`}>{attendanceLoading ? "--" : `${absentPercent}%`}</span></div></div><div><p className={`text-sm ${mutedClass}`}>Employees absent</p><p className={`text-xl font-bold ${strongClass}`}>{attendanceLoading ? "--" : absentCount}</p></div></div>
              </div>
            </section>

            <section className={`rounded-[1.35rem] border p-4 md:p-5 ${isDarkMode ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-emerald-100 bg-emerald-50 text-emerald-900"}`}>
              <div className="flex items-start gap-3"><div className={`rounded-2xl p-2.5 ${isDarkMode ? "bg-emerald-500/20" : "bg-emerald-100"}`}><BriefcaseBusiness className="h-5 w-5 text-emerald-600" /></div><div><p className="text-sm font-semibold">Admin access is active</p><p className="mt-1 text-sm opacity-90">Manage users, attendance, accounting, and forecasting from the current navigation.</p></div></div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
