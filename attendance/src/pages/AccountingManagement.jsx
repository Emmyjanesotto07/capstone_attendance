import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Wallet,
  LayoutDashboard,
  Settings,
  FileSpreadsheet,
  Users,
  BarChart3,
  LogOut,
  UserCircle,
  Moon,
  Sun,
  Menu,
  X,
  Loader,
  Save,
  Trash2,
  PlusCircle
} from "lucide-react";
import PageSkeleton from "../components/PageSkeleton";
import { clearAuthSession, getAuthToken, getAuthUserFromToken } from "../utils/authSession";
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
const DEFAULT_OFFICE = OFFICE_OPTIONS[0].value;
const EMPLOYEE_CATEGORY_OPTIONS = ["regular", "cos", "job_order"];

const formatOfficeLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "mayor's office" || normalized === "mayors office") {
    return "Mayor's Office";
  }

  if (normalized === "hrmo") {
    return "HRMO";
  }

  return value || "";
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toLocaleString("en-PH", { style: "currency", currency: "PHP" }) : "₱0.00";
};

export default function AccountingManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_API_URL;
  const token = getAuthToken();
  const authUser = getAuthUserFromToken();
  const role = authUser?.role || "staff";

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
  const [loadingData, setLoadingData] = useState(true);
  const [salaryProfiles, setSalaryProfiles] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [autofillingSalary, setAutofillingSalary] = useState(false);
  const [salarySaving, setSalarySaving] = useState(false);
  const [salaryDeletingId, setSalaryDeletingId] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDeletingId, setProfileDeletingId] = useState(null);

  const [salaryRecords, setSalaryRecords] = useState([]);
  const [salaryPreview, setSalaryPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");

  const [editingSalary, setEditingSalary] = useState(null);
  const [selectedProfileBiometricId, setSelectedProfileBiometricId] = useState("");
  const [salaryEmployeeName, setSalaryEmployeeName] = useState("");
  const [salaryEmployeeBiometricId, setSalaryEmployeeBiometricId] = useState("");
  const [salaryCategory, setSalaryCategory] = useState("regular");
  const [salaryGrade, setSalaryGrade] = useState("");
  const [salaryGradeAmount, setSalaryGradeAmount] = useState("");
  const [salaryWorkingDays, setSalaryWorkingDays] = useState("22");
  const [salaryPresentDays, setSalaryPresentDays] = useState("22");
  const [salaryAbsentDays, setSalaryAbsentDays] = useState("");
  const [salaryHolidayDays, setSalaryHolidayDays] = useState("");
  const [salaryDailyRate, setSalaryDailyRate] = useState("");
  const [salaryPayPeriodStart, setSalaryPayPeriodStart] = useState(() => now.toISOString().slice(0, 10));
  const [salaryPayPeriodEnd, setSalaryPayPeriodEnd] = useState(() => now.toISOString().slice(0, 10));
  const [salaryAllowance, setSalaryAllowance] = useState("");
  const [salaryOvertimeHours, setSalaryOvertimeHours] = useState("");
  const [salaryOvertimeRate, setSalaryOvertimeRate] = useState("");
  const [salaryTax, setSalaryTax] = useState("");
  const [salarySss, setSalarySss] = useState("");
  const [salaryGsis, setSalaryGsis] = useState("");
  const [salaryPhilhealth, setSalaryPhilhealth] = useState("");
  const [salaryPagibig, setSalaryPagibig] = useState("");
  const [salaryOtherDeduction, setSalaryOtherDeduction] = useState("");
  const [salaryAutoGovernmentDeductions, setSalaryAutoGovernmentDeductions] = useState(true);
  const [salaryStatus, setSalaryStatus] = useState("pending");
  const [salaryOffice, setSalaryOffice] = useState(DEFAULT_OFFICE);

  const [editingProfile, setEditingProfile] = useState(null);
  const [profileEmployeeBiometricId, setProfileEmployeeBiometricId] = useState("");
  const [profileEmployeeName, setProfileEmployeeName] = useState("");
  const [profileCategory, setProfileCategory] = useState("regular");
  const [profileSalaryGrade, setProfileSalaryGrade] = useState("");
  const [profileSalaryGradeAmount, setProfileSalaryGradeAmount] = useState("");
  const [profileDailyRate, setProfileDailyRate] = useState("");
  const [profileAllowance, setProfileAllowance] = useState("");
  const [profileTax, setProfileTax] = useState("");
  const [profileSss, setProfileSss] = useState("");
  const [profileGsis, setProfileGsis] = useState("");
  const [profilePhilhealth, setProfilePhilhealth] = useState("");
  const [profilePagibig, setProfilePagibig] = useState("");
  const [profileOtherDeduction, setProfileOtherDeduction] = useState("");
  const [profileAutoGovernmentDeductions, setProfileAutoGovernmentDeductions] = useState(true);
  const [profileOffice, setProfileOffice] = useState(DEFAULT_OFFICE);

  const navItems = useMemo(() => {
    if (role === "admin") {
      return [
        { label: "Admin Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Attendance Records", to: "/attendance/records", icon: FileSpreadsheet },
        { label: "Forecasting", to: "/admin/forecasting", icon: BarChart3 },
        { label: "Manage Users", to: "/admin/users", icon: Users },
        { label: "Accounting", to: "/accounting", icon: Wallet },
        { label: "Settings", to: "/settings", icon: Settings }
      ];
    }

    return [
      { label: "Staff Dashboard", to: "/staff/dashboard", icon: LayoutDashboard },
      { label: "Accounting", to: "/accounting", icon: Wallet },
      { label: "Settings", to: "/settings", icon: Settings }
    ];
  }, [role]);

  const resetProfileForm = () => {
    setEditingProfile(null);
    setProfileEmployeeBiometricId("");
    setProfileEmployeeName("");
    setProfileCategory("regular");
    setProfileSalaryGrade("");
    setProfileSalaryGradeAmount("");
    setProfileDailyRate("");
    setProfileAllowance("");
    setProfileTax("");
    setProfileSss("");
    setProfileGsis("");
    setProfilePhilhealth("");
    setProfilePagibig("");
    setProfileOtherDeduction("");
    setProfileAutoGovernmentDeductions(true);
    setProfileOffice(DEFAULT_OFFICE);
  };

  const applyEditingProfile = (profile) => {
    setEditingProfile(profile);
    setProfileEmployeeBiometricId(profile.employeeBiometricId || "");
    setProfileEmployeeName(profile.employeeName || "");
    setProfileCategory(profile.employeeCategory || "regular");
    setProfileSalaryGrade(profile.salaryGrade || "");
    setProfileSalaryGradeAmount(String(profile.salaryGradeAmount || "0"));
    setProfileDailyRate(String(profile.dailyRate || "0"));
    setProfileAllowance(String(profile.defaultAllowance || "0"));
    setProfileTax(String(profile.defaultTaxDeduction || "0"));
    setProfileSss(String(profile.defaultSssDeduction || "0"));
    setProfileGsis(String(profile.defaultGsisDeduction || "0"));
    setProfilePhilhealth(String(profile.defaultPhilhealthDeduction || "0"));
    setProfilePagibig(String(profile.defaultPagibigDeduction || "0"));
    setProfileOtherDeduction(String(profile.defaultOtherDeduction || "0"));
    setProfileAutoGovernmentDeductions(profile.autoGovernmentDeductions !== false);
    setProfileOffice(profile.campus || DEFAULT_OFFICE);
  };

  const resetSalaryForm = () => {
    setEditingSalary(null);
    setSelectedProfileBiometricId("");
    setSalaryEmployeeName("");
    setSalaryEmployeeBiometricId("");
    setSalaryCategory("regular");
    setSalaryGrade("");
    setSalaryGradeAmount("");
    setSalaryWorkingDays("22");
    setSalaryPresentDays("22");
    setSalaryAbsentDays("");
    setSalaryHolidayDays("");
    setSalaryDailyRate("");
    setSalaryPayPeriodStart(now.toISOString().slice(0, 10));
    setSalaryPayPeriodEnd(now.toISOString().slice(0, 10));
    setSalaryAllowance("");
    setSalaryOvertimeHours("");
    setSalaryOvertimeRate("");
    setSalaryTax("");
    setSalarySss("");
    setSalaryGsis("");
    setSalaryPhilhealth("");
    setSalaryPagibig("");
    setSalaryOtherDeduction("");
    setSalaryAutoGovernmentDeductions(true);
    setSalaryStatus("pending");
    setSalaryOffice(DEFAULT_OFFICE);
    setSalaryPreview(null);
  };

  const applyEditingSalary = (record) => {
    setEditingSalary(record);
    setSalaryEmployeeName(record.employeeName || "");
    setSalaryEmployeeBiometricId(record.employeeBiometricId || "");
    setSalaryCategory(record.employeeCategory || "regular");
    setSalaryGrade(record.salaryGrade || "");
    setSalaryGradeAmount(String(record.salaryGradeAmount || "0"));
    setSalaryWorkingDays(String(record.workingDays || "0"));
    setSalaryPresentDays(String(record.presentDays || "0"));
    setSalaryAbsentDays(String(record.absentDays || "0"));
    setSalaryHolidayDays(String(record.holidayDays || "0"));
    setSalaryDailyRate(String(record.dailyRate || "0"));
    setSalaryPayPeriodStart(String(record.payPeriodStart || "").slice(0, 10));
    setSalaryPayPeriodEnd(String(record.payPeriodEnd || "").slice(0, 10));
    setSalaryAllowance(String(record.allowance || "0"));
    setSalaryOvertimeHours(String(record.overtimeHours || "0"));
    setSalaryOvertimeRate(String(record.overtimeRate || "0"));
    setSalaryTax(String(record.taxDeduction || "0"));
    setSalarySss(String(record.sssDeduction || "0"));
    setSalaryGsis(String(record.gsisDeduction || "0"));
    setSalaryPhilhealth(String(record.philhealthDeduction || "0"));
    setSalaryPagibig(String(record.pagibigDeduction || "0"));
    setSalaryOtherDeduction(String(record.otherDeduction || "0"));
    setSalaryAutoGovernmentDeductions(record.autoGovernmentDeductions !== false);
    setSalaryStatus(String(record.status || "pending"));
    setSalaryOffice(String(record.campus || DEFAULT_OFFICE).toLowerCase());
    setSalaryPreview({
      basicSalary: Number(record.basicSalary || 0),
      allowance: Number(record.allowance || 0),
      overtimeHours: Number(record.overtimeHours || 0),
      overtimeRate: Number(record.overtimeRate || 0),
      overtimePay: Number(record.overtimePay || 0),
      taxDeduction: Number(record.taxDeduction || 0),
      sssDeduction: Number(record.sssDeduction || 0),
      gsisDeduction: Number(record.gsisDeduction || 0),
      philhealthDeduction: Number(record.philhealthDeduction || 0),
      pagibigDeduction: Number(record.pagibigDeduction || 0),
      otherDeduction: Number(record.otherDeduction || 0),
      autoGovernmentDeductions: record.autoGovernmentDeductions !== false,
      grossSalary: Number(record.grossSalary || 0),
      totalDeduction: Number(record.totalDeduction || 0),
      netSalary: Number(record.netSalary || 0)
    });
  };

  const buildOfficeParam = () => (officeFilter !== "all" ? officeFilter : "");

  const fetchData = async () => {
    if (!token) {
      navigate("/");
      return;
    }

    setLoadingData(true);
    setError("");

    try {
      const summaryParams = new URLSearchParams({ month: String(month), year: String(year) });
      const office = buildOfficeParam();

      if (office) {
        summaryParams.set("department", office);
      }

      const [salariesRes, profilesRes] = await Promise.all([
        fetch(`${API}/api/accounting/salaries?${summaryParams.toString()}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }),
        fetch(`${API}/api/accounting/salary-profiles${office ? `?department=${encodeURIComponent(office)}` : ""}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ]);

      const salariesData = await salariesRes.json();
      const profilesData = await profilesRes.json();

      if (!salariesRes.ok) {
        setError(salariesData.message || salariesData.error || "Failed to load salary records.");
        return;
      }

      if (!profilesRes.ok) {
        setError(profilesData.message || profilesData.error || "Failed to load salary profiles.");
        return;
      }

      setSalaryRecords(salariesData.records || []);
      setSalaryProfiles(profilesData.profiles || []);
    } catch {
      setError("Connection error while loading accounting data.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const delay = getNetworkBasedSkeletonDelay();
    const timer = setTimeout(() => setPageLoading(false), delay);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, [API, token, month, year, search, officeFilter]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const handleAutofillSalary = async () => {
    const biometricId = (selectedProfileBiometricId || salaryEmployeeBiometricId).trim();

    if (!biometricId) {
      setError("Select a salary profile or enter biometric ID first.");
      return;
    }

    if (!salaryPayPeriodStart || !salaryPayPeriodEnd) {
      setError("Pay period dates are required before autofill.");
      return;
    }

    setAutofillingSalary(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/accounting/salaries/autofill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeBiometricId: biometricId,
          payPeriodStart: salaryPayPeriodStart,
          payPeriodEnd: salaryPayPeriodEnd
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to auto-fill salary data.");
        return;
      }

      const suggested = data.suggested || {};
      setSalaryEmployeeName(suggested.employeeName || "");
      setSalaryEmployeeBiometricId(suggested.employeeBiometricId || biometricId);
      setSalaryCategory(suggested.employeeCategory || "regular");
      setSalaryGrade(suggested.salaryGrade || "");
      setSalaryGradeAmount(String(suggested.salaryGradeAmount || "0"));
      setSalaryDailyRate(String(suggested.dailyRate || "0"));
      setSalaryWorkingDays(String(suggested.workingDays || "0"));
      setSalaryPresentDays(String(suggested.presentDays || "0"));
      setSalaryAbsentDays(String(suggested.absentDays || "0"));
      setSalaryHolidayDays(String(suggested.holidayDays || "0"));
      setSalaryAllowance(String(suggested.allowance || "0"));
      setSalaryTax(String(suggested.taxDeduction || "0"));
      setSalarySss(String(suggested.sssDeduction || "0"));
      setSalaryGsis(String(suggested.gsisDeduction || "0"));
      setSalaryPhilhealth(String(suggested.philhealthDeduction || "0"));
      setSalaryPagibig(String(suggested.pagibigDeduction || "0"));
      setSalaryOtherDeduction(String(suggested.otherDeduction || "0"));
      setSalaryAutoGovernmentDeductions(suggested.autoGovernmentDeductions !== false);
      setSalaryOffice(String(suggested.campus || salaryOffice));
      setSalaryPreview(data.computation || null);
      setSuccess("Salary fields auto-filled from profile and attendance records.");
    } catch {
      setError("Connection error while auto-filling salary.");
    } finally {
      setAutofillingSalary(false);
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!profileEmployeeBiometricId.trim()) {
      setError("Profile biometric ID is required.");
      return;
    }

    if (!profileEmployeeName.trim()) {
      setError("Profile employee name is required.");
      return;
    }

    setProfileSaving(true);

    try {
      const payload = {
        employeeBiometricId: profileEmployeeBiometricId.trim(),
        employeeName: profileEmployeeName.trim(),
        employeeCategory: profileCategory,
        salaryGrade: profileSalaryGrade,
        salaryGradeAmount: Number(profileSalaryGradeAmount || 0),
        dailyRate: Number(profileDailyRate || 0),
        defaultAllowance: Number(profileAllowance || 0),
        defaultTaxDeduction: Number(profileTax || 0),
        defaultSssDeduction: Number(profileSss || 0),
        defaultGsisDeduction: Number(profileGsis || 0),
        defaultPhilhealthDeduction: Number(profilePhilhealth || 0),
        defaultPagibigDeduction: Number(profilePagibig || 0),
        defaultOtherDeduction: Number(profileOtherDeduction || 0),
        autoGovernmentDeductions: profileAutoGovernmentDeductions,
        campus: profileOffice
      };

      const endpoint = editingProfile
        ? `${API}/api/accounting/salary-profiles/${editingProfile.id}`
        : `${API}/api/accounting/salary-profiles`;

      const res = await fetch(endpoint, {
        method: editingProfile ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to save salary profile.");
        return;
      }

      setSuccess(editingProfile ? "Salary profile updated." : "Salary profile created.");
      resetProfileForm();
      await fetchData();
    } catch {
      setError("Connection error while saving salary profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteProfile = async (profile) => {
    const confirmed = window.confirm(`Delete salary profile for ${profile.employeeName}?`);

    if (!confirmed) {
      return;
    }

    setProfileDeletingId(profile.id);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API}/api/accounting/salary-profiles/${profile.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to delete salary profile.");
        return;
      }

      setSuccess("Salary profile deleted.");

      if (editingProfile?.id === profile.id) {
        resetProfileForm();
      }

      await fetchData();
    } catch {
      setError("Connection error while deleting salary profile.");
    } finally {
      setProfileDeletingId(null);
    }
  };

  const buildSalaryPayload = () => {
    const campusValue = salaryOffice;

    return {
      employeeName: salaryEmployeeName.trim(),
      employeeBiometricId: salaryEmployeeBiometricId.trim(),
      employeeCategory: salaryCategory,
      salaryGrade: salaryGrade.trim(),
      salaryGradeAmount: Number(salaryGradeAmount || 0),
      workingDays: Number(salaryWorkingDays || 0),
      presentDays: Number(salaryPresentDays || 0),
      absentDays: Number(salaryAbsentDays || 0),
      holidayDays: Number(salaryHolidayDays || 0),
      dailyRate: Number(salaryDailyRate || 0),
      payPeriodStart: salaryPayPeriodStart,
      payPeriodEnd: salaryPayPeriodEnd,
      allowance: Number(salaryAllowance || 0),
      overtimeHours: Number(salaryOvertimeHours || 0),
      overtimeRate: Number(salaryOvertimeRate || 0),
      taxDeduction: Number(salaryTax || 0),
      sssDeduction: Number(salarySss || 0),
      gsisDeduction: Number(salaryGsis || 0),
      philhealthDeduction: Number(salaryPhilhealth || 0),
      pagibigDeduction: Number(salaryPagibig || 0),
      otherDeduction: Number(salaryOtherDeduction || 0),
      autoGovernmentDeductions: salaryAutoGovernmentDeductions,
      status: salaryStatus,
      campus: campusValue
    };
  };

  const handleComputeSalary = async () => {
    setError("");
    const payload = buildSalaryPayload();

    if (!payload.employeeName) {
      setError("Employee name is required for salary computation.");
      return;
    }

    if (!payload.payPeriodStart || !payload.payPeriodEnd) {
      setError("Pay period dates are required.");
      return;
    }

    if (!EMPLOYEE_CATEGORY_OPTIONS.includes(payload.employeeCategory)) {
      setError("Employee category is required.");
      return;
    }

    if (["regular", "cos"].includes(payload.employeeCategory) && payload.salaryGradeAmount <= 0) {
      setError("Salary grade amount must be greater than 0 for regular/COS.");
      return;
    }

    if (payload.employeeCategory === "cos" && payload.workingDays <= 0) {
      setError("Working days must be greater than 0 for COS.");
      return;
    }

    if (payload.employeeCategory === "job_order" && payload.dailyRate <= 0) {
      setError("Daily rate must be greater than 0 for job order.");
      return;
    }

    try {
      const res = await fetch(`${API}/api/accounting/salaries/compute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to compute salary.");
        return;
      }

      setSalaryPreview(data.computation || null);
    } catch {
      setError("Connection error while computing salary.");
    }
  };

  const handleSaveSalary = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = buildSalaryPayload();

    if (!payload.employeeName) {
      setError("Employee name is required.");
      return;
    }

    if (!payload.payPeriodStart || !payload.payPeriodEnd) {
      setError("Pay period start and end are required.");
      return;
    }

    if (!EMPLOYEE_CATEGORY_OPTIONS.includes(payload.employeeCategory)) {
      setError("Employee category is required.");
      return;
    }

    if (["regular", "cos"].includes(payload.employeeCategory) && payload.salaryGradeAmount <= 0) {
      setError("Salary grade amount must be greater than 0 for regular/COS.");
      return;
    }

    if (payload.employeeCategory === "cos" && payload.workingDays <= 0) {
      setError("Working days must be greater than 0 for COS.");
      return;
    }

    if (payload.employeeCategory === "job_order" && payload.dailyRate <= 0) {
      setError("Daily rate must be greater than 0 for job order.");
      return;
    }

    setSalarySaving(true);

    try {
      const endpoint = editingSalary
        ? `${API}/api/accounting/salaries/${editingSalary.id}`
        : `${API}/api/accounting/salaries`;

      const method = editingSalary ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to save salary record.");
        return;
      }

      setSuccess(editingSalary ? "Salary record updated." : "Salary record created.");
      resetSalaryForm();
      await fetchData();
    } catch {
      setError("Connection error while saving salary record.");
    } finally {
      setSalarySaving(false);
    }
  };

  const handleDeleteSalary = async (record) => {
    const confirmed = window.confirm(`Delete salary record for ${record.employeeName}?`);

    if (!confirmed) {
      return;
    }

    setSalaryDeletingId(record.id);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API}/api/accounting/salaries/${record.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to delete salary record.");
        return;
      }

      setSuccess("Salary record deleted.");

      if (editingSalary?.id === record.id) {
        resetSalaryForm();
      }

      await fetchData();
    } catch {
      setError("Connection error while deleting salary record.");
    } finally {
      setSalaryDeletingId(null);
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
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Manage accounting and payroll tools from one place.</p>
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
                  <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Office</p>
                  <p className={`mt-1 text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Admin</p>
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
            <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Manage accounting and payroll tools from one place.</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Role</p>
                <p className={`mt-1 text-lg font-semibold capitalize ${isDarkMode ? "text-white" : "text-slate-900"}`}>{role}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                <p className={`text-[11px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Office</p>
                <p className={`mt-1 text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Admin</p>
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
              <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Accounting Panel</p>
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
                <Wallet className="w-7 h-7 text-emerald-600" />
                Accounting Management
              </h1>
              <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Manage office salary computation and payroll records.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Month</label>
                <select
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                >
                  {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                  placeholder="Year"
                />
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Office</label>
                <select
                  value={officeFilter}
                  onChange={(event) => setOfficeFilter(event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                >
                  <option value="all">All Offices</option>
                  {OFFICE_OPTIONS.map((office) => (
                    <option key={office.value} value={office.value}>{office.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee/biometric ID"
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                />
              </div>
            </div>

            {(error || success) && (
              <div className="space-y-2">
                {error && (
                  <div className={`rounded-lg border px-4 py-3 text-sm ${isDarkMode ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
                    {error}
                  </div>
                )}
                {success && (
                  <div className={`rounded-lg border px-4 py-3 text-sm ${isDarkMode ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    {success}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border p-4 space-y-4 border-indigo-300/50 bg-indigo-50/40">
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Salary Computation & Management</h2>

              <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
                <form onSubmit={handleSaveSalary} className={`rounded-xl border p-4 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"}`}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Salary Profile</label>
                      <select
                        value={selectedProfileBiometricId}
                        onChange={(event) => {
                          const biometricId = event.target.value;
                          setSelectedProfileBiometricId(biometricId);

                          const profile = salaryProfiles.find((item) => item.employeeBiometricId === biometricId);

                          if (profile) {
                            setSalaryEmployeeName(profile.employeeName || "");
                            setSalaryEmployeeBiometricId(profile.employeeBiometricId || "");
                            setSalaryCategory(profile.employeeCategory || "regular");
                            setSalaryGrade(profile.salaryGrade || "");
                            setSalaryGradeAmount(String(profile.salaryGradeAmount || "0"));
                            setSalaryDailyRate(String(profile.dailyRate || "0"));
                            setSalaryAllowance(String(profile.defaultAllowance || "0"));
                            setSalaryTax(String(profile.defaultTaxDeduction || "0"));
                            setSalarySss(String(profile.defaultSssDeduction || "0"));
                            setSalaryGsis(String(profile.defaultGsisDeduction || "0"));
                            setSalaryPhilhealth(String(profile.defaultPhilhealthDeduction || "0"));
                            setSalaryPagibig(String(profile.defaultPagibigDeduction || "0"));
                            setSalaryOtherDeduction(String(profile.defaultOtherDeduction || "0"));
                            setSalaryAutoGovernmentDeductions(profile.autoGovernmentDeductions !== false);
                            setSalaryOffice(profile.campus || salaryOffice);
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                      >
                        <option value="">Select salary profile</option>
                        {salaryProfiles.map((profile) => (
                          <option key={profile.id} value={profile.employeeBiometricId}>
                            {profile.employeeName} ({profile.employeeBiometricId})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutofillSalary}
                      disabled={autofillingSalary}
                      className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm"
                    >
                      {autofillingSalary ? "Auto-filling..." : "Auto-fill Days"}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Employee Name</label>
                    <input
                      type="text"
                      value={salaryEmployeeName}
                      onChange={(event) => setSalaryEmployeeName(event.target.value)}
                      placeholder="Employee name"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Biometric ID</label>
                    <input
                      type="text"
                      value={salaryEmployeeBiometricId}
                      onChange={(event) => setSalaryEmployeeBiometricId(event.target.value)}
                      placeholder="Biometric ID"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={salaryCategory}
                      onChange={(event) => setSalaryCategory(event.target.value)}
                      aria-label="Employee category"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                    >
                      {EMPLOYEE_CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>

                    {salaryCategory === "job_order" ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={salaryDailyRate}
                        onChange={(event) => setSalaryDailyRate(event.target.value)}
                        aria-label="Daily rate"
                        placeholder="Daily rate"
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={salaryGrade}
                        onChange={(event) => setSalaryGrade(event.target.value)}
                        aria-label="Salary grade"
                        placeholder="Salary grade (e.g. SG-11)"
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                      />
                    )}
                  </div>

                  {salaryCategory !== "job_order" ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salaryGradeAmount}
                      onChange={(event) => setSalaryGradeAmount(event.target.value)}
                      aria-label="Salary grade amount"
                      placeholder="Salary grade amount"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                    />
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={salaryPresentDays}
                      onChange={(event) => setSalaryPresentDays(event.target.value)}
                      aria-label="Present days"
                      placeholder={salaryCategory === "job_order" ? "Rendered days" : "Present days"}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                    />

                    {salaryCategory === "cos" ? (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={salaryWorkingDays}
                        onChange={(event) => setSalaryWorkingDays(event.target.value)}
                        aria-label="Working days"
                        placeholder="Working days"
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={salaryAbsentDays}
                        onChange={(event) => setSalaryAbsentDays(event.target.value)}
                        aria-label="Absent days"
                        placeholder="Absent days"
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                      />
                    )}
                  </div>

                  {salaryCategory === "cos" && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={salaryAbsentDays}
                        onChange={(event) => setSalaryAbsentDays(event.target.value)}
                        aria-label="Absent days"
                        placeholder="Absent days"
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={salaryHolidayDays}
                        onChange={(event) => setSalaryHolidayDays(event.target.value)}
                        aria-label="Holiday days"
                        placeholder="Holiday days (unpaid)"
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Pay Period Start</label>
                      <input
                        type="date"
                        value={salaryPayPeriodStart}
                        onChange={(event) => setSalaryPayPeriodStart(event.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Pay Period End</label>
                      <input
                        type="date"
                        value={salaryPayPeriodEnd}
                        onChange={(event) => setSalaryPayPeriodEnd(event.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className={`col-span-2 inline-flex items-center gap-2 text-sm ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                      <input
                        type="checkbox"
                        checked={salaryAutoGovernmentDeductions}
                        onChange={(event) => setSalaryAutoGovernmentDeductions(event.target.checked)}
                      />
                      Auto-calculate government deductions (SSS, PhilHealth, Pag-IBIG, withholding tax)
                    </label>
                    <input type="number" min="0" step="0.01" value={salaryAllowance} onChange={(event) => setSalaryAllowance(event.target.value)} aria-label="Allowance" placeholder="Allowance" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={salaryOvertimeHours} onChange={(event) => setSalaryOvertimeHours(event.target.value)} aria-label="Overtime hours" placeholder="Overtime hours" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={salaryOvertimeRate} onChange={(event) => setSalaryOvertimeRate(event.target.value)} aria-label="Overtime rate" placeholder="Overtime rate" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <p className={`col-span-2 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      Deductions
                    </p>
                    <input type="number" min="0" step="0.01" value={salaryTax} onChange={(event) => setSalaryTax(event.target.value)} aria-label="Withholding tax" placeholder="Withholding tax" disabled={salaryAutoGovernmentDeductions} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={salarySss} onChange={(event) => setSalarySss(event.target.value)} aria-label="SSS deduction" placeholder="SSS deduction" disabled={salaryAutoGovernmentDeductions} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={salaryGsis} onChange={(event) => setSalaryGsis(event.target.value)} aria-label="GSIS deduction" placeholder="GSIS deduction" disabled={salaryAutoGovernmentDeductions} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={salaryPhilhealth} onChange={(event) => setSalaryPhilhealth(event.target.value)} aria-label="PhilHealth deduction" placeholder="PhilHealth deduction" disabled={salaryAutoGovernmentDeductions} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={salaryPagibig} onChange={(event) => setSalaryPagibig(event.target.value)} aria-label="Pag-IBIG deduction" placeholder="Pag-IBIG deduction" disabled={salaryAutoGovernmentDeductions} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={salaryOtherDeduction} onChange={(event) => setSalaryOtherDeduction(event.target.value)} aria-label="Other deduction" placeholder="Other deduction" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select value={salaryStatus} onChange={(event) => setSalaryStatus(event.target.value)} aria-label="Salary status" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}>
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                    </select>
                    <select value={salaryOffice} onChange={(event) => setSalaryOffice(event.target.value)} aria-label="Salary office" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}>
                      {OFFICE_OPTIONS.map((office) => (
                        <option key={office.value} value={office.value}>{office.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={handleComputeSalary} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Compute</button>
                    <button type="submit" disabled={salarySaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm">
                      {salarySaving ? <Loader className="w-4 h-4 animate-spin" /> : editingSalary ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                      {editingSalary ? "Update Salary" : "Create Salary"}
                    </button>
                    {editingSalary && (
                      <button type="button" onClick={resetSalaryForm} className={`px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "border-slate-600 text-slate-200 hover:bg-slate-700" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>Cancel</button>
                    )}
                  </div>
                </form>

                <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"}`}>
                  <div className={`px-4 py-2 text-xs font-semibold uppercase ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    Computation Preview
                  </div>
                  <div className="p-4 text-sm space-y-2">
                    {!salaryPreview ? (
                      <p className={`${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Click Compute to preview salary breakdown.</p>
                    ) : (
                      <>
                        <p className={`${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Computed Basic Pay: <strong>{formatMoney(salaryPreview.basicSalary)}</strong></p>
                        <p className={`${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Gross Salary: <strong>{formatMoney(salaryPreview.grossSalary)}</strong></p>
                        <p className={`${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Overtime Pay: <strong>{formatMoney(salaryPreview.overtimePay)}</strong></p>
                        <p className={`${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Withholding Tax: <strong>{formatMoney(salaryPreview.taxDeduction)}</strong></p>
                        <p className={`${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>SSS: <strong>{formatMoney(salaryPreview.sssDeduction)}</strong></p>
                        <p className={`${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>GSIS: <strong>{formatMoney(salaryPreview.gsisDeduction)}</strong></p>
                        <p className={`${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>PhilHealth: <strong>{formatMoney(salaryPreview.philhealthDeduction)}</strong></p>
                        <p className={`${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Pag-IBIG: <strong>{formatMoney(salaryPreview.pagibigDeduction)}</strong></p>
                        <p className={`${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Total Deduction: <strong>{formatMoney(salaryPreview.totalDeduction)}</strong></p>
                        <p className={`${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>Net Salary: <strong>{formatMoney(salaryPreview.netSalary)}</strong></p>
                      </>
                    )}
                  </div>

                  <div className={`grid grid-cols-[1.2fr_.8fr_.8fr_.8fr_.8fr_.8fr] gap-3 px-4 py-2 text-xs font-semibold uppercase border-t ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                    <span>Employee</span>
                    <span>Category</span>
                    <span>Office</span>
                    <span>Status</span>
                    <span className="text-right">Net Salary</span>
                    <span className="text-right">Actions</span>
                  </div>

                  <div className={`max-h-[360px] overflow-y-auto ${isDarkMode ? "bg-slate-900/20" : "bg-white"}`}>
                    {salaryRecords.length === 0 ? (
                      <div className={`px-4 py-6 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No salary records found.</div>
                    ) : (
                      salaryRecords.map((record) => (
                        <div key={record.id} className={`grid grid-cols-[1.2fr_.8fr_.8fr_.8fr_.8fr_.8fr] gap-3 px-4 py-3 text-sm border-t first:border-t-0 ${isDarkMode ? "border-slate-700 text-slate-200" : "border-slate-200 text-slate-700"}`}>
                          <div>
                            <p className="font-medium">{record.employeeName}</p>
                            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{record.payPeriodStart} to {record.payPeriodEnd}</p>
                          </div>
                          <span className="capitalize">{record.employeeCategory || "regular"}</span>
                          <span>{formatOfficeLabel(record.campus)}</span>
                          <span className="capitalize">{record.status}</span>
                          <span className="text-right font-semibold">{formatMoney(record.netSalary)}</span>
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button type="button" onClick={() => applyEditingSalary(record)} className="text-xs px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Edit</button>
                            <button type="button" onClick={() => handleDeleteSalary(record)} disabled={salaryDeletingId === record.id} className="text-xs px-2.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60">
                              {salaryDeletingId === record.id ? <Loader className="w-3 h-3 animate-spin inline-block" /> : <Trash2 className="w-3 h-3 inline-block" />}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4 border-emerald-300/50 bg-emerald-50/40">
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Employee Salary Profiles</h2>
              <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Save employee category and salary defaults once. Accounting can then auto-fill salary and attendance-based day counts.
              </p>

              <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
                <form onSubmit={handleSaveProfile} className={`rounded-xl border p-4 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"}`}>
                  <input
                    type="text"
                    value={profileEmployeeBiometricId}
                    onChange={(event) => setProfileEmployeeBiometricId(event.target.value)}
                    aria-label="Profile biometric ID"
                    placeholder="Biometric ID"
                    disabled={Boolean(editingProfile)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                  />
                  <input
                    type="text"
                    value={profileEmployeeName}
                    onChange={(event) => setProfileEmployeeName(event.target.value)}
                    aria-label="Profile employee name"
                    placeholder="Employee name"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={profileCategory}
                      onChange={(event) => setProfileCategory(event.target.value)}
                      aria-label="Profile employee category"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                    >
                      {EMPLOYEE_CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <select
                      value={profileOffice}
                      onChange={(event) => setProfileOffice(event.target.value)}
                      aria-label="Profile office"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                    >
                      {OFFICE_OPTIONS.map((office) => (
                        <option key={office.value} value={office.value}>{office.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className={`col-span-2 inline-flex items-center gap-2 text-sm ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                      <input
                        type="checkbox"
                        checked={profileAutoGovernmentDeductions}
                        onChange={(event) => setProfileAutoGovernmentDeductions(event.target.checked)}
                      />
                      Auto-calculate government deductions by default
                    </label>
                    {profileCategory === "job_order" ? (
                      <input type="number" min="0" step="0.01" value={profileDailyRate} onChange={(event) => setProfileDailyRate(event.target.value)} aria-label="Profile daily rate" placeholder="Daily rate" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    ) : (
                      <input type="text" value={profileSalaryGrade} onChange={(event) => setProfileSalaryGrade(event.target.value)} aria-label="Profile salary grade" placeholder="Salary grade" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    )}
                    <input type="number" min="0" step="0.01" value={profileSalaryGradeAmount} onChange={(event) => setProfileSalaryGradeAmount(event.target.value)} aria-label="Profile salary grade amount" placeholder="Salary grade amount" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={profileAllowance} onChange={(event) => setProfileAllowance(event.target.value)} aria-label="Profile default allowance" placeholder="Default allowance" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <p className={`col-span-2 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      Default Deductions
                    </p>
                    <input type="number" min="0" step="0.01" value={profileTax} onChange={(event) => setProfileTax(event.target.value)} aria-label="Profile default withholding tax" placeholder="Default withholding tax" disabled={profileAutoGovernmentDeductions} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={profileSss} onChange={(event) => setProfileSss(event.target.value)} aria-label="Profile default SSS" placeholder="Default SSS" disabled={profileAutoGovernmentDeductions} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={profileGsis} onChange={(event) => setProfileGsis(event.target.value)} aria-label="Profile default GSIS" placeholder="Default GSIS" disabled={profileAutoGovernmentDeductions} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={profilePhilhealth} onChange={(event) => setProfilePhilhealth(event.target.value)} aria-label="Profile default PhilHealth" placeholder="Default PhilHealth" disabled={profileAutoGovernmentDeductions} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={profilePagibig} onChange={(event) => setProfilePagibig(event.target.value)} aria-label="Profile default Pag-IBIG" placeholder="Default Pag-IBIG" disabled={profileAutoGovernmentDeductions} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                    <input type="number" min="0" step="0.01" value={profileOtherDeduction} onChange={(event) => setProfileOtherDeduction(event.target.value)} aria-label="Profile default other deduction" placeholder="Default other deduction" className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`} />
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" disabled={profileSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm">
                      {profileSaving ? <Loader className="w-4 h-4 animate-spin" /> : editingProfile ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                      {editingProfile ? "Update Profile" : "Create Profile"}
                    </button>
                    {editingProfile && (
                      <button type="button" onClick={resetProfileForm} className={`px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "border-slate-600 text-slate-200 hover:bg-slate-700" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>Cancel</button>
                    )}
                  </div>
                </form>

                <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"}`}>
                  <div className={`grid grid-cols-[1.2fr_.8fr_.8fr_.8fr] gap-3 px-4 py-2 text-xs font-semibold uppercase ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    <span>Employee</span>
                    <span>Category</span>
                    <span>Office</span>
                    <span className="text-right">Actions</span>
                  </div>
                  <div className={`max-h-[360px] overflow-y-auto ${isDarkMode ? "bg-slate-900/20" : "bg-white"}`}>
                    {salaryProfiles.length === 0 ? (
                      <div className={`px-4 py-6 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No salary profiles yet.</div>
                    ) : (
                      salaryProfiles.map((profile) => (
                        <div key={profile.id} className={`grid grid-cols-[1.2fr_.8fr_.8fr_.8fr] gap-3 px-4 py-3 text-sm border-t first:border-t-0 ${isDarkMode ? "border-slate-700 text-slate-200" : "border-slate-200 text-slate-700"}`}>
                          <div>
                            <p className="font-medium">{profile.employeeName}</p>
                            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{profile.employeeBiometricId}</p>
                          </div>
                          <span className="capitalize">{profile.employeeCategory}</span>
                          <span>{formatOfficeLabel(profile.campus)}</span>
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button type="button" onClick={() => applyEditingProfile(profile)} className="text-xs px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Edit</button>
                            <button type="button" onClick={() => handleDeleteProfile(profile)} disabled={profileDeletingId === profile.id} className="text-xs px-2.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60">
                              {profileDeletingId === profile.id ? <Loader className="w-3 h-3 animate-spin inline-block" /> : <Trash2 className="w-3 h-3 inline-block" />}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
