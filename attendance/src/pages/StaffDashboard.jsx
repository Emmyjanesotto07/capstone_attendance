import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, BadgeCheck, Bell, BriefcaseBusiness, Clock3, LayoutDashboard, LogOut, Menu, Moon, Settings, ShieldCheck, Sun, UserCircle, X } from "lucide-react";
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [attendanceSummaryLoading, setAttendanceSummaryLoading] = useState(true);
  const [attendanceSummaryError, setAttendanceSummaryError] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);
  const [attendanceSummary, setAttendanceSummary] = useState({
    monthLabel: "Current Month",
    flexiTime: false,
    shiftSchedule: "",
    lateGraceMinutes: 1,
    expectedWorkDays: 0,
    presentDays: 0,
    onTimeDays: 0,
    lateDays: 0,
    repeatedLatePattern: { detected: false, lateDays: 0, threshold: 3, message: null },
    absentDays: 0,
    presentPercent: 0,
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

    const fetchDashboardData = async (showLoading = false) => {
      if (showLoading) {
        setAttendanceSummaryLoading(true);
      }

      let summaryLoaded = false;

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/my-summary`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || data.error || "Unable to load your attendance summary.");
        }

        if (!data.summary) {
          throw new Error("Attendance summary was not returned by the server.");
        }

        setAttendanceSummary((prev) => ({
          ...prev,
          ...data.summary
        }));
        setAttendanceSummaryError("");
        summaryLoaded = true;

        {
          const notificationRes = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/my-notifications`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          const notificationData = await notificationRes.json();

          if (notificationRes.ok) {
            setNotifications(notificationData.notifications || []);
            setUnreadNotificationCount(notificationData.unreadCount || 0);
            setNotificationError("");
          } else {
            setNotificationError(notificationData.message || notificationData.error || "Unable to load notifications.");
          }
        }
      } catch (error) {
        if (summaryLoaded) {
          setNotificationError(error.message || "Connection error while loading notifications.");
        } else {
          setAttendanceSummaryError(error.message || "Connection error while loading attendance.");
        }
      } finally {
        setAttendanceSummaryLoading(false);
      }
    };

    const handleAttendanceUpdate = () => {
      fetchDashboardData(true);
    };

    fetchDashboardData(true);
    window.addEventListener("attendance-data-updated", handleAttendanceUpdate);
    const refreshTimer = setInterval(() => fetchDashboardData(), 60_000);

    return () => {
      window.removeEventListener("attendance-data-updated", handleAttendanceUpdate);
      clearInterval(refreshTimer);
    };
  }, [attendanceRefreshKey]);

  const handleMarkNotificationRead = async (notification) => {
    if (notification.isRead) {
      return;
    }

    const token = getAuthToken();

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/my-notifications/${notification.id}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        setNotifications((current) => current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item
        ));
        setUnreadNotificationCount((count) => Math.max(0, count - 1));
        setNotificationError("");
      } else {
        setNotificationError("Unable to mark this notification as read.");
      }
    } catch (error) {
      setNotificationError(error.message || "Connection error while updating the notification.");
    }
  };

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
  const presentPercent = Math.max(0, Math.min(100, Number(attendanceSummary.presentPercent) || 0));
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
                  onClick={() => setShowNotifications((open) => !open)}
                  aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ""}`}
                  aria-expanded={showNotifications}
                  className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${isDarkMode ? "border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className={`absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-2xl ${isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
                    <div className={`border-b px-4 py-3 text-sm font-semibold ${strongClass} ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                      Notifications
                    </div>
                    {notificationError && (
                      <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">
                        {notificationError}
                      </p>
                    )}
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className={`px-4 py-6 text-center text-sm ${mutedClass}`}>No notifications yet.</p>
                      ) : notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleMarkNotificationRead(notification)}
                          className={`block w-full border-b px-4 py-3 text-left transition-colors last:border-b-0 ${
                            isDarkMode
                              ? `border-slate-700 hover:bg-slate-700 ${notification.isRead ? "" : "bg-slate-700/40"}`
                              : `border-slate-100 hover:bg-slate-50 ${notification.isRead ? "" : "bg-emerald-50/70"}`
                          }`}
                        >
                          <span className={`flex items-start justify-between gap-3 text-sm font-semibold ${strongClass}`}>
                            {notification.title}
                            {!notification.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                          </span>
                          <span className={`mt-1 block text-xs leading-5 ${mutedClass}`}>{notification.message}</span>
                          <span className={`mt-2 block text-[11px] ${mutedClass}`}>
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
            {attendanceSummaryError && (
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${isDarkMode ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-red-200 bg-red-50 text-red-700"}`} role="alert">
                <span>{attendanceSummaryError}</span>
                <button
                  type="button"
                  onClick={() => setAttendanceRefreshKey((current) => current + 1)}
                  className={`rounded-lg border px-3 py-1.5 font-semibold transition-colors ${isDarkMode ? "border-red-400/40 hover:bg-red-500/20" : "border-red-300 hover:bg-red-100"}`}
                >
                  Retry
                </button>
              </div>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`rounded-[1.35rem] border p-4 ${isDarkMode ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-100 bg-emerald-50"}`}>
                <p className={`text-sm ${mutedClass}`}>Present</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className={`text-2xl font-bold ${strongClass}`}>
                    {attendanceSummaryLoading ? "--" : attendanceSummary.presentDays}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isDarkMode ? "bg-emerald-500/20 text-emerald-200" : "bg-white/80 text-emerald-700"}`}
                    aria-label={`Present rate ${attendanceSummaryLoading ? "loading" : `${presentPercent}%`}`}
                  >
                    {attendanceSummaryLoading ? "--" : `${presentPercent}%`}
                  </span>
                </div>
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
                {attendanceSummary.flexiTime && (
                  <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-violet-600">
                    <Clock3 className="h-4 w-4" />
                    Flexi-time · {attendanceSummary.shiftSchedule} · {attendanceSummary.lateGraceMinutes}-minute grace
                  </p>
                )}
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

            {!attendanceSummaryLoading && attendanceSummary.repeatedLatePattern?.detected && (
              <section className={`rounded-[1.35rem] border p-4 md:p-5 ${isDarkMode ? "border-amber-500/30 bg-amber-500/10 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-950"}`} role="status">
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl p-2 ${isDarkMode ? "bg-amber-500/20" : "bg-amber-100"}`}>
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Repeated late pattern detected</p>
                    <p className="mt-1 text-sm opacity-90">
                      You have {attendanceSummary.repeatedLatePattern.lateDays} late arrivals this month, reaching the limit of {attendanceSummary.repeatedLatePattern.threshold}.
                    </p>
                  </div>
                </div>
              </section>
            )}

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
