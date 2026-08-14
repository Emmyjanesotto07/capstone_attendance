import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Loader, UserCircle, Moon, Sun, Save, KeyRound } from "lucide-react";
import PageSkeleton from "../components/PageSkeleton";
import { clearAuthSession, getAuthToken, getAuthUserFromToken } from "../utils/authSession";
import { getNetworkBasedSkeletonDelay, wait } from "../utils/networkSkeleton";

const OFFICE_OPTIONS = [
  "tourism",
  "mayor's office",
  "hrmo",
  "sb",
  "vice mayor office",
  "mpdo",
  "mswdo",
  "meo",
  "mao",
  "budget",
  "malasakit",
  "gad",
  "bac",
  "treasurer",
  "accounting",
  "masso",
  "gso",
  "mcr"
];
const MAX_PROFILE_PICTURE_BYTES = 2 * 1024 * 1024;

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Invalid image file."));
      image.src = String(reader.result || "");
    };

    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to compress image."));
        return;
      }

      resolve(blob);
    }, mimeType, quality);
  });

const compressImageToLimit = async (file, maxBytes) => {
  if (file.size <= maxBytes) {
    return file;
  }

  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image compression is not supported in this browser.");
  }

  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  let quality = outputType === "image/png" ? undefined : 0.92;
  let compressedBlob = await canvasToBlob(canvas, outputType, quality);

  while (compressedBlob.size > maxBytes && quality && quality > 0.45) {
    quality = Number((quality - 0.07).toFixed(2));
    compressedBlob = await canvasToBlob(canvas, outputType, quality);
  }

  if (compressedBlob.size > maxBytes) {
    throw new Error("Unable to compress image below 2MB. Please choose another image.");
  }

  const extension = outputType === "image/png" ? "png" : "jpg";
  const safeName = (file.name || "profile").replace(/\.[^/.]+$/, "");

  return new File([compressedBlob], `${safeName}.${extension}`, {
    type: outputType,
    lastModified: Date.now()
  });
};

export default function Settings() {
  const navigate = useNavigate();
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

  const [loadingProfile, setLoadingProfile] = useState(true);

  const [completeName, setCompleteName] = useState("");
  const [email, setEmail] = useState("");
  const [office, setOffice] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreviewUrl, setProfilePicturePreviewUrl] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const dashboardPath = useMemo(() => (role === "admin" ? "/admin/dashboard" : "/staff/dashboard"), [role]);

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    if (!profilePictureFile) {
      setProfilePicturePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(profilePictureFile);
    setProfilePicturePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [profilePictureFile]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        navigate("/");
        return;
      }

      const minimumSkeletonDelay = wait(getNetworkBasedSkeletonDelay());

      try {
        const profileRequest = fetch(`${API}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const [res] = await Promise.all([profileRequest, minimumSkeletonDelay]);

        const data = await res.json();

        if (!res.ok) {
          setAccountError(data.message || data.error || "Failed to load profile.");
          return;
        }

        setCompleteName(data.user?.CompleteName || "");
        setEmail(data.user?.email || "");
        setOffice(data.user?.offices || data.user?.college || data.user?.departments || data.user?.campus || "");
        setProfilePictureUrl(data.user?.profilePictureUrl || "");
      } catch {
        setAccountError("Connection error while loading profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [API, navigate, token]);

  const validateAccount = () => {
    if (!completeName.trim()) {
      return "Complete name is required.";
    }

    if (completeName.trim().length < 2) {
      return "Complete name must be at least 2 characters.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return "Please enter a valid email address.";
    }

    if (!OFFICE_OPTIONS.includes(office.toLowerCase())) {
      return "Please select a valid office.";
    }

    return "";
  };

  const validatePassword = () => {
    if (!currentPassword) {
      return "Current password is required.";
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    if (!strongPasswordRegex.test(newPassword)) {
      return "New password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
    }

    if (newPassword !== confirmNewPassword) {
      return "New password and confirm password do not match.";
    }

    return "";
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    setAccountError("");
    setAccountSuccess("");

    const validationError = validateAccount();

    if (validationError) {
      setAccountError(validationError);
      return;
    }

    setSavingAccount(true);

    try {
      const formData = new FormData();
      formData.append("CompleteName", completeName.trim());
      formData.append("email", email.trim());
      formData.append("offices", office.toLowerCase());
      formData.append("departments", office.toLowerCase());

      if (profilePictureFile) {
        formData.append("profilePicture", profilePictureFile);
      }

      const res = await fetch(`${API}/api/auth/update-account`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        setAccountError(data.message || data.error || "Failed to update account.");
        return;
      }

      setAccountSuccess("Account updated successfully.");
      setProfilePictureFile(null);
      setProfilePicturePreviewUrl("");

      if (data.user?.profilePictureUrl) {
        setProfilePictureUrl(data.user.profilePictureUrl);
      }
    } catch {
      setAccountError("Connection error while updating account.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const validationError = validatePassword();

    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.message || data.error || "Failed to change password.");
        return;
      }

      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      setPasswordError("Connection error while changing password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  if (loadingProfile) {
    return <PageSkeleton dark={isDarkMode} type="settings" />;
  }

  return (
    <div
      className={`min-h-screen p-4 md:p-6 ${
        isDarkMode
          ? "bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900"
          : "bg-gradient-to-br from-emerald-50 via-white to-amber-50"
      }`}
    >
      <div className="max-w-5xl mx-auto space-y-5">
        <div className={`rounded-2xl border shadow-xl overflow-hidden ${
          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}>
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-amber-400" />
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDarkMode ? "border-slate-700" : "border-slate-200"
          }`}>
            <div className="inline-flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-emerald-600" />
              <p className={`font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Account Settings</p>
            </div>

            <div className="flex items-center gap-2">
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

              <Link
                to={dashboardPath}
                className="inline-flex items-center px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                Back to Dashboard
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleUpdateAccount} className={`rounded-xl border p-5 space-y-4 ${
              isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"
            }`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Update Account</h2>

              <div className="flex items-center gap-4">
                {(profilePicturePreviewUrl || profilePictureUrl) ? (
                  <img
                    src={profilePicturePreviewUrl || profilePictureUrl}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border border-emerald-500/40"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-full border flex items-center justify-center ${
                    isDarkMode ? "border-slate-600 bg-slate-800" : "border-slate-300 bg-white"
                  }`}>
                    <UserCircle className={`w-10 h-10 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                  </div>
                )}

                <div className="flex-1">
                  <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Profile Picture (max 2MB)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const selectedFile = e.target.files?.[0] || null;

                      if (!selectedFile) {
                        setProfilePictureFile(null);
                        return;
                      }

                      if (!selectedFile.type.startsWith("image/")) {
                        setAccountError("Profile picture must be an image file.");
                        setProfilePictureFile(null);
                        return;
                      }

                      try {
                        const compressedFile = await compressImageToLimit(selectedFile, MAX_PROFILE_PICTURE_BYTES);
                        setAccountError("");
                        setProfilePictureFile(compressedFile);
                      } catch (error) {
                        setAccountError(error.message || "Failed to compress image.");
                        setProfilePictureFile(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 ${
                      isDarkMode
                        ? "bg-slate-800 border-slate-600 text-white"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                  {profilePictureFile && (
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Selected: {profilePictureFile.name}</p>
                  )}
                </div>
              </div>

              {accountError && (
                <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                  isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
                }`}>
                  <AlertCircle className={`w-4 h-4 mt-0.5 ${isDarkMode ? "text-red-300" : "text-red-500"}`} />
                  <p className={`text-sm ${isDarkMode ? "text-red-200" : "text-red-700"}`}>{accountError}</p>
                </div>
              )}

              {accountSuccess && (
                <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                  isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"
                }`}>
                  <CheckCircle className={`w-4 h-4 mt-0.5 ${isDarkMode ? "text-green-300" : "text-green-600"}`} />
                  <p className={`text-sm ${isDarkMode ? "text-green-200" : "text-green-700"}`}>{accountSuccess}</p>
                </div>
              )}

              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Complete Name</label>
                <input
                  value={completeName}
                  onChange={(e) => setCompleteName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-600 text-white"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-600 text-white"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                  required
                />
              </div>

              <div>
                  <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Office</label>
                <select
                    value={office}
                    onChange={(e) => setOffice(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-600 text-white"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                  required
                >
                    <option value="">Select office</option>
                    {OFFICE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={savingAccount || loadingProfile}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-60"
              >
                {savingAccount ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Account
              </button>
            </form>

            <form onSubmit={handleChangePassword} className={`rounded-xl border p-5 space-y-4 ${
              isDarkMode ? "border-slate-700 bg-slate-700/20" : "border-slate-200 bg-slate-50"
            }`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Change Password</h2>

              {passwordError && (
                <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                  isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
                }`}>
                  <AlertCircle className={`w-4 h-4 mt-0.5 ${isDarkMode ? "text-red-300" : "text-red-500"}`} />
                  <p className={`text-sm ${isDarkMode ? "text-red-200" : "text-red-700"}`}>{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                  isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"
                }`}>
                  <CheckCircle className={`w-4 h-4 mt-0.5 ${isDarkMode ? "text-green-300" : "text-green-600"}`} />
                  <p className={`text-sm ${isDarkMode ? "text-green-200" : "text-green-700"}`}>{passwordSuccess}</p>
                </div>
              )}

              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-600 text-white"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-600 text-white"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-600 text-white"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-60"
              >
                {savingPassword ? <Loader className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Change Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
