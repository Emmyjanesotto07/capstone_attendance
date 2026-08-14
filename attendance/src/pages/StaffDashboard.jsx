import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, BadgeCheck, BriefcaseBusiness, Clock3, LayoutDashboard, LogOut, Menu, Moon, Settings, ShieldCheck, Sun, UserCircle, X } from "lucide-react";
import PageSkeleton from "../components/PageSkeleton";
import { clearAuthSession, getAuthToken, getAuthUserFromToken } from "../utils/authSession";
import { getNetworkBasedSkeletonDelay } from "../utils/networkSkeleton";

export default function StaffDashboard() {
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
  const [attendanceSummaryLoading, setAttendanceSummaryLoading] = useState(true);
  const [attendanceSummary, setAttendanceSummary] = useState({
    monthLabel: "Current Month",
    expectedWorkDays: 0,
    presentDays: 0,
    onTimeDays: 0,
    lateDays: 0,
    absentDays: 0,
    onTimePercent: 0,
    latePercent: 0,
    absentPercent: 0
  });

  const authUser = getAuthUserFromToken();
  const email = authUser?.email || "staff@minsu.edu.ph";
  const role = String(authUser?.role || "staff").toLowerCase();

  const navItems = [
    { label: "Staff Dashboard", to: "/staff/dashboard", icon: LayoutDashboard },
    { label: "Settings", to: "/settings", icon: Settings }
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
    const token = getAuthToken();

    if (!token) {
      setAttendanceSummaryLoading(false);
      return;
    }

    const fetchAttendanceSummary = async () => {
      setAttendanceSummaryLoading(true);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/my-summary`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();

        if (res.ok && data.summary) {
          setAttendanceSummary((prev) => ({
            ...prev,
            ...data.summary
          }));
        }
      } catch {
      } finally {
        setAttendanceSummaryLoading(false);
      }
    };

    fetchAttendanceSummary();
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
  const latePercent = Math.max(0, Math.min(100, Number(attendanceSummary.latePercent) || 0));
  const absentPercent = Math.max(0, Math.min(100, Number(attendanceSummary.absentPercent) || 0));
  const lateRingStyle = {
    background: `conic-gradient(rgb(245 158 11) ${latePercent}%, ${isDarkMode ? "rgb(51 65 85)" : "rgb(226 232 240)"} ${latePercent}% 100%)`
  };
  const absentRingStyle = {
    background: `conic-gradient(rgb(239 68 68) ${absentPercent}%, ${isDarkMode ? "rgb(51 65 85)" : "rgb(226 232 240)"} ${absentPercent}% 100%)`
  };

  return (
    <div className={`relative min-h-screen overflow-hidden p-3 md:p-4 transition-colors duration-300 ${shellClass}`}>
      <div className={`pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full blur-3xl ${isDarkMode ? "bg-emerald-500/10" : "bg-emerald-300/20"}`}></div>
      <div className={`pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full blur-3xl ${isDarkMode ? "bg-amber-500/10" : "bg-amber-300/20"}`}></div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>

          <aside className={`absolute left-0 top-0 h-full w-72 border-r shadow-2xl overflow-hidden backdrop-blur-xl ${panelClass}`}>
            <div className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-500">Workspace</p>
                  <h2 className={`mt-1 text-lg font-semibold ${strongClass}`}>Staff Menu</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className={`rounded-lg border p-2 transition-colors ${isDarkMode ? "border-slate-600 text-slate-200 hover:bg-slate-700" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className={`mt-3 text-sm ${mutedClass}`}>{email}</p>
              <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${chipClass}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {role.toUpperCase()}
              </div>

              <nav className="mt-6 flex-1 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                        isActive
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                          : isDarkMode
                            ? "border-transparent text-slate-100 hover:bg-slate-700"
                            : "border-transparent text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-[280px_1fr] md:gap-5">
        <aside className={`hidden h-fit overflow-hidden rounded-[1.75rem] border shadow-xl backdrop-blur-xl md:block ${panelClass}`}>
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-500">Workspace</p>
            <h2 className={`mt-1 text-xl font-semibold ${strongClass}`}>Staff Menu</h2>
            <p className={`mt-2 text-sm ${mutedClass}`}>{email}</p>
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${chipClass}`}>
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
              Active session
            </div>

            <nav className="mt-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      isActive
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                        : isDarkMode
                          ? "border-transparent text-slate-100 hover:bg-slate-700"
                          : "border-transparent text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                      {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
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
                <p className={`text-base font-semibold ${strongClass}`}>Staff Panel</p>
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
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`rounded-[1.35rem] border p-4 ${isDarkMode ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-100 bg-emerald-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Present</p>
                <p className={`mt-2 text-2xl font-bold ${strongClass}`}>
                  {attendanceSummaryLoading ? "--" : attendanceSummary.presentDays}
                </p>
              </div>
              <div className={`rounded-[1.35rem] border p-4 ${isDarkMode ? "border-red-500/30 bg-red-500/10" : "border-red-100 bg-red-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Absent</p>
                <p className={`mt-2 text-2xl font-bold ${strongClass}`}>
                  {attendanceSummaryLoading ? "--" : attendanceSummary.absentDays}
                </p>
              </div>
              <div className={`rounded-[1.35rem] border p-4 ${isDarkMode ? "border-amber-500/30 bg-amber-500/10" : "border-amber-100 bg-amber-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Late</p>
                <p className={`mt-2 text-2xl font-bold ${strongClass}`}>
                  {attendanceSummaryLoading ? "--" : attendanceSummary.lateDays}
                </p>
              </div>
              <div className={`rounded-[1.35rem] border p-4 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Work days</p>
                <p className={`mt-2 text-2xl font-bold ${strongClass}`}>
                  {attendanceSummaryLoading ? "--" : attendanceSummary.expectedWorkDays}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className={`rounded-[1.35rem] border p-5 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Current role</p>
                <p className={`mt-1 text-lg font-semibold ${strongClass}`}>{role.toUpperCase()}</p>
                <p className={`mt-3 text-sm ${mutedClass}`}>Signed in as</p>
                <p className={`mt-1 inline-flex items-center gap-2 text-base font-semibold ${strongClass}`}>
                  <UserCircle className="w-5 h-5 text-emerald-500" />
                  {email}
                </p>
                <p className={`mt-4 inline-flex items-center gap-2 text-xs font-semibold ${mutedClass}`}>
                  <BadgeCheck className="w-4 h-4 text-emerald-500" />
                  {attendanceSummary.monthLabel}
                </p>
              </div>

              <div className={`rounded-[1.35rem] border p-5 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${strongClass}`}>Late %</p>
                  <Clock3 className="w-5 h-5 text-amber-500" />
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative grid h-24 w-24 place-items-center rounded-full" style={lateRingStyle}>
                    <div className={`grid h-16 w-16 place-items-center rounded-full ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
                      <span className={`text-sm font-bold ${strongClass}`}>
                        {attendanceSummaryLoading ? "--" : `${latePercent}%`}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className={`text-sm ${mutedClass}`}>Days late</p>
                    <p className={`text-xl font-bold ${strongClass}`}>{attendanceSummaryLoading ? "--" : attendanceSummary.lateDays}</p>
                  </div>
                </div>
              </div>

              <div className={`rounded-[1.35rem] border p-5 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${strongClass}`}>Absent %</p>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative grid h-24 w-24 place-items-center rounded-full" style={absentRingStyle}>
                    <div className={`grid h-16 w-16 place-items-center rounded-full ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
                      <span className={`text-sm font-bold ${strongClass}`}>
                        {attendanceSummaryLoading ? "--" : `${absentPercent}%`}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className={`text-sm ${mutedClass}`}>Days absent</p>
                    <p className={`text-xl font-bold ${strongClass}`}>{attendanceSummaryLoading ? "--" : attendanceSummary.absentDays}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className={`rounded-[1.35rem] border p-4 md:p-5 ${isDarkMode ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-emerald-100 bg-emerald-50 text-emerald-900"}`}>
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-2.5 ${isDarkMode ? "bg-emerald-500/20" : "bg-emerald-100"}`}>
                  <BriefcaseBusiness className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Staff access is active</p>
                  <p className="mt-1 text-sm opacity-90">Use this space for attendance input, schedules, and profile tasks without losing the current navigation pattern.</p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
