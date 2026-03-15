import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "../config";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus({ type: "error", message: "Invalid reset link" });
      setVerifying(false);
      return;
    }

    // In a full implementation, you might want to call a verify-token endpoint here.
    // Since our backend doesn't have a standalone verify endpoint, we just assume it's valid
    // and let the reset-password endpoint handle validation.
    setVerifying(false);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = searchParams.get("token");

    if (!password || password.length < 6) {
      setStatus({ type: "error", message: "Password must be at least 6 characters" });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match" });
      return;
    }

    if (!token) {
      setStatus({ type: "error", message: "Invalid reset link" });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password");
      }
      
      setStatus({ type: "success", message: "Password reset successfully! Redirecting to login..." });
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      console.error("Password reset error:", error);
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <NeoPage>
        <SiteHeader hideCta />
        <main className="w-full flex items-center justify-center py-24">
          <div className="text-center">
            <p className="text-xl font-heavy">Verifying reset link...</p>
          </div>
        </main>
        <NeoFooter />
      </NeoPage>
    );
  }

  return (
    <NeoPage>
      <SiteHeader hideCta />

      <main className="w-full flex items-center justify-center py-12 md:py-24 px-6">
        <div className="card-neo w-full max-w-lg space-y-6">
          <div className="space-y-2">
            {status && (
              <div
                className={`text-center font-heavy text-lg ${
                  status.type === "success" ? "text-green-600" : "text-neo-main"
                }`}
              >
                {status.message}
              </div>
            )}
            <h1 className="text-5xl font-display font-extrabold text-neo-black mb-4 text-center">
              Reset Password
            </h1>
            {email && (
              <p className="text-center text-gray-700 text-lg">
                Reset password for your account
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-lg font-heavy text-neo-black mb-2">
                New Password
              </label>
              <input
                type="password"
                id="password"
                className="input-neo"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-lg font-heavy text-neo-black mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirm-password"
                className="input-neo"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn-neo-main w-full text-lg disabled:opacity-60"
              disabled={loading || status?.type === "success"}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="text-center">
            <a href="/login" className="font-bold text-neo-black hover:text-neo-main underline decoration-4">
              Back to Login
            </a>
          </div>
        </div>
      </main>

      <NeoFooter />
    </NeoPage>
  );
};

export default ResetPasswordPage;









