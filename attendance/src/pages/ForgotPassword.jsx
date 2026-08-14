import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Loader, Mail } from "lucide-react";
import PageSkeleton from "../components/PageSkeleton";
import { getNetworkBasedSkeletonDelay } from "../utils/networkSkeleton";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const delay = getNetworkBasedSkeletonDelay();
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  const validateEmail = (value) => {
    if (!value.trim()) {
      return "Email is required.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
      return "Please enter a valid email address.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateEmail(email);

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to process request.");
        return;
      }

      setSuccess(data.message || "Password reset request submitted.");
      setEmail("");
    } catch (err) {
      setError("Connection error. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <PageSkeleton type="auth" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <div className="w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden bg-white border-slate-200">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-amber-400" />
        <div className="p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Forgot Password</h1>
            <p className="text-sm text-slate-600">Enter your account email to request password reset.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 border rounded-lg flex items-start gap-3 bg-red-50 border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 border rounded-lg flex items-start gap-3 bg-green-50 border-green-200">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 pointer-events-none text-slate-500" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </button>

            <p className="text-center text-sm mt-6 text-slate-600">
              Remember your password? {" "}
              <Link to="/" className="text-emerald-600 hover:text-emerald-500 font-medium transition-colors">
                Back to sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
