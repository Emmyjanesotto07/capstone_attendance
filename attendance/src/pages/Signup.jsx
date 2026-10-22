import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, ChevronDown, Eye, EyeOff, GraduationCap, Loader, Lock, Mail, Moon, Sun, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageSkeleton from "../components/PageSkeleton";
import { getNetworkBasedSkeletonDelay } from "../utils/networkSkeleton";

const OFFICE_OPTIONS = [
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

export default function Signup() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [pageLoading, setPageLoading] = useState(true);
  const [completeName, setCompleteName] = useState("");
  const [email, setEmail] = useState("");
  const [office, setOffice] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [employeeCategory, setEmployeeCategory] = useState("regular");
  const [shiftSchedule, setShiftSchedule] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const delay = getNetworkBasedSkeletonDelay();
    const timer = setTimeout(() => setPageLoading(false), delay);
    return () => clearTimeout(timer);
  }, []);

  const validateFields = () => {
    const errors = {};
    const trimmedName = completeName.trim();

    if (!trimmedName) {
      errors.completeName = "Complete name is required.";
    } else if (trimmedName.length < 2) {
      errors.completeName = "Complete name must be at least 2 characters.";
    }

    if (!email.trim()) {
      errors.email = "Email is required.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = "Please enter a valid email address.";
      }
    }

    if (!office) {
      errors.office = "Office is required.";
    } else if (!OFFICE_OPTIONS.some((option) => option.value === office.toLowerCase())) {
      errors.office = "Please select a valid office.";
    }

    if (!contactNumber.trim()) errors.contactNumber = "Contact number is required.";
    if (!emergencyContact.trim()) errors.emergencyContact = "Emergency contact is required.";
    if (!department.trim()) errors.department = "Department is required.";
    if (!position.trim()) errors.position = "Position or job title is required.";
    if (!shiftSchedule.trim()) errors.shiftSchedule = "Shift schedule is required.";

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    if (!password) {
      errors.password = "Password is required.";
    } else if (!strongPasswordRegex.test(password)) {
      errors.password = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password is required.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    const validationErrors = validateFields();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          CompleteName: completeName.trim(),
          email: email.trim(),
          offices: office.toLowerCase(),
          departments: office.toLowerCase(),
          contactNumber: contactNumber.trim(),
          emergencyContact: emergencyContact.trim(),
          department: department.trim(),
          position: position.trim(),
          employeeCategory,
          shiftSchedule: shiftSchedule.trim(),
          password
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setCompleteName("");
        setEmail("");
        setOffice("");
        setContactNumber("");
        setEmergencyContact("");
        setDepartment("");
        setPosition("");
        setEmployeeCategory("regular");
        setShiftSchedule("");
        setPassword("");
        setConfirmPassword("");

        setTimeout(() => navigate("/"), 1200);
        return;
      }

      setError(data.message || data.error || "Signup failed. Please try again.");
    } catch {
      setError("Connection error. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

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
      <div
        className={`absolute top-0 left-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-pulse ${
          isDarkMode ? "bg-emerald-500 opacity-10" : "bg-emerald-300 opacity-20"
        }`}
      />
      <div
        className={`absolute bottom-0 right-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-pulse ${
          isDarkMode ? "bg-amber-500 opacity-10" : "bg-amber-300 opacity-20"
        }`}
        style={{ animationDelay: "2s" }}
      />

      <button
        type="button"
        onClick={() => setIsDarkMode((prev) => !prev)}
        className={`absolute top-6 right-6 z-10 inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors duration-200 ${
          isDarkMode ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
        }`}
        aria-label="Toggle theme"
      >
        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {isDarkMode ? "Light" : "Dark"}
      </button>

      <div className="relative w-full max-w-6xl">
        <div className={`overflow-hidden rounded-3xl shadow-2xl border backdrop-blur-xl ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div
              className={`hidden lg:flex lg:flex-col lg:justify-between p-12 relative overflow-hidden ${
                isDarkMode
                  ? "bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950"
                  : "bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700"
              }`}
            >
              <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-xl mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <h2 className="text-4xl font-bold text-white leading-tight">Municipality Attendance</h2>
                <p className="mt-3 text-emerald-100 max-w-md text-sm leading-6">
                  A cleaner onboarding experience for municipal staff, with secure access and department-aware attendance management.
                </p>

                <div className="mt-10 grid gap-4">
                  {[
                    ["Fast attendance tracking", "Log in and manage daily presence faster."],
                    ["Department access", "Keep Mayor's Office and HRMO workflows organized."],
                    ["Security-first design", "Protected entry for staff and administrators."],
                  ].map(([title, description]) => (
                    <div key={title} className="flex gap-3 rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">{title}</h3>
                        <p className="text-xs text-emerald-100/90 mt-1">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 pt-8 border-t border-white/10">
                <p className="text-emerald-100 text-xs">Municipality Attendance Management System</p>
                <p className="text-emerald-100 text-xs mt-1">Create an account to access your office dashboard and attendance tools.</p>
              </div>
            </div>

            <div className={`p-8 md:p-10 ${isDarkMode ? "bg-slate-800" : "bg-white"}`}>
              <div className="lg:hidden mb-8">
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${isDarkMode ? "border-emerald-500/30 text-emerald-200 bg-emerald-500/10" : "border-emerald-200 text-emerald-700 bg-emerald-50"}`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Municipality Attendance
                </div>
              </div>

              <div className="text-center mb-8">
                <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>Create Account</h1>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Sign up to get started</p>
              </div>

              {error && (
                <div className={`mb-6 p-4 border rounded-xl flex items-start gap-3 ${isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}>
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDarkMode ? "text-red-400" : "text-red-500"}`} />
                  <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-700"}`}>{error}</p>
                </div>
              )}

              {success && (
                <div className={`mb-6 p-4 border rounded-xl flex items-start gap-3 ${isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"}`}>
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                  <p className={`text-sm ${isDarkMode ? "text-green-300" : "text-green-700"}`}>Account created. Redirecting to login...</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Full Name</label>
                  <div className="relative">
                    <User className={`absolute left-3 top-3.5 w-5 h-5 pointer-events-none ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                    <input
                      type="text"
                      placeholder="Juan Dela Cruz"
                      value={completeName}
                      onChange={(e) => setCompleteName(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                      required
                    />
                  </div>
                  {fieldErrors.completeName && <p className={`text-xs mt-1 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{fieldErrors.completeName}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Email</label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-3.5 w-5 h-5 pointer-events-none ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                      required
                    />
                  </div>
                  {fieldErrors.email && <p className={`text-xs mt-1 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Office</label>
                  <div className="relative">
                    <GraduationCap className={`absolute left-3 top-3.5 w-5 h-5 pointer-events-none ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                    <select
                      value={office}
                      onChange={(e) => setOffice(e.target.value)}
                      className={`w-full pl-10 pr-10 py-3 border rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                      required
                    >
                      <option value="">Select office</option>
                      {OFFICE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-3.5 w-5 h-5 pointer-events-none ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                  </div>
                  {fieldErrors.office && <p className={`text-xs mt-1 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{fieldErrors.office}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Contact Number</label>
                    <input
                      type="tel"
                      autoComplete="tel"
                      placeholder="09XX XXX XXXX"
                      value={contactNumber}
                      onChange={(event) => setContactNumber(event.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                      required
                    />
                    {fieldErrors.contactNumber && <p className={`text-xs mt-1 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{fieldErrors.contactNumber}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Emergency Contact</label>
                    <input
                      type="text"
                      placeholder="Name and phone number"
                      value={emergencyContact}
                      onChange={(event) => setEmergencyContact(event.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                      required
                    />
                    {fieldErrors.emergencyContact && <p className={`text-xs mt-1 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{fieldErrors.emergencyContact}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Human Resources"
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                      required
                    />
                    {fieldErrors.department && <p className={`text-xs mt-1 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{fieldErrors.department}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Position / Job Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Administrative Officer"
                      value={position}
                      onChange={(event) => setPosition(event.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                      required
                    />
                    {fieldErrors.position && <p className={`text-xs mt-1 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{fieldErrors.position}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Employee Category</label>
                    <select
                      value={employeeCategory}
                      onChange={(event) => setEmployeeCategory(event.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                      required
                    >
                      <option value="regular">Regular</option>
                      <option value="cos">COS</option>
                      <option value="job_order">Job Order</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Shift Schedule</label>
                    <input
                      type="text"
                      placeholder="e.g. 8:00 AM - 5:00 PM"
                      value={shiftSchedule}
                      onChange={(event) => setShiftSchedule(event.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                      required
                    />
                    {fieldErrors.shiftSchedule && <p className={`text-xs mt-1 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{fieldErrors.shiftSchedule}</p>}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Password</label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-3.5 w-5 h-5 pointer-events-none ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className={`absolute right-3 top-3.5 ${isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className={`text-xs mt-1 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Confirm Password</label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-3.5 w-5 h-5 pointer-events-none ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 ${
                        isDarkMode ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className={`absolute right-3 top-3.5 ${isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className={`text-xs mt-1 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{fieldErrors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-8 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
                  {loading ? "Creating account..." : "Sign Up"}
                </button>

                <p className={`text-center text-sm mt-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Already have an account?{" "}
                  <Link to="/" className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}