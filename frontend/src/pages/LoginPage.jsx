import { useEffect, useState } from "react";
import { Chrome, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";
import { GoogleLogin, useGoogleLogin } from "@react-oauth/google";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get redirect path from URL, default to /profile
  const getRedirectPath = () => {
    return searchParams.get("redirect") || "/profile";
  };

  const { login } = useAuth();

  const nextStep = (message) => {
    setStatus({ type: "success", message });
    const redirectPath = getRedirectPath();
    navigate(redirectPath);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: tokenResponse.credential }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to authenticate with Google");
      
      // Update the AuthContext with the received token and user data
      login(data.token, data.user);
      
      nextStep("Signed in with Google!");
    } catch (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (codeResponse) => {
       // useGoogleLogin gives access token by default. 
       // For our backend we need idToken, so simplest is to use the <GoogleLogin /> component 
       // which returns a credential (idToken). 
    },
    onError: (error) => setStatus({ type: "error", message: "Google Login Failed" })
  });
  
  const handleEmailLogin = async (event) => {
    event.preventDefault();
    if (!email || !email.trim() || !validateEmail(email)) {
      setStatus({ type: "error", message: "Please enter a valid email address" });
      return;
    }
    if (!password) {
      setStatus({ type: "error", message: "Please enter your password" });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (data.requiresPasswordReset) {
          setStatus({ type: "error", message: data.message });
        } else {
          throw new Error(data.message || "Failed to sign in. Please try again.");
        }
        setLoading(false);
        return;
      }
      
      nextStep("Welcome back!");
    } catch (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!email || !email.trim() || !validateEmail(email)) {
      setStatus({ type: "error", message: "Please enter a valid email address" });
      return;
    }
    if (!password || password.length < 6) {
      setStatus({ type: "error", message: "Password must be at least 6 characters long" });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);
      
      const res = await fetch(`${API_URL}/api/auth/register-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || "Failed to create account. Please try again.");
      
      nextStep("Account created successfully!");
    } catch (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email || !email.trim() || !validateEmail(email)) {
      setStatus({ type: "error", message: "Please enter a valid email address first" });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);
      
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || "Failed to send reset email");
      
      setStatus({
        type: "success",
        message: "Password reset link sent! Check your email (including spam folder).",
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <NeoPage>
        <SiteHeader hideCta />
        <main className="w-full flex items-center justify-center py-12 md:py-24 px-6">
          <div className="text-lg font-heavy">Loading...</div>
        </main>
        <NeoFooter />
      </NeoPage>
    );
  }

  useEffect(() => {
    if (user && !authLoading) {
      navigate(getRedirectPath());
    }
  }, [user, authLoading, navigate, searchParams]);

  return (
    <NeoPage>
    <SiteHeader hideCta />

      <main className="w-full flex items-center justify-center py-12 md:py-24 px-6">
        <div className="card-neo w-full max-w-lg space-y-6">
          <div className="space-y-2">
            {status && (
              <div
                className={`text-center font-heavy ${
                  status.type === "success" ? "text-green-600" : status.type === "error" ? "text-neo-main" : "text-neo-black"
                }`}
              >
                {status.message}
              </div>
            )}
            <h1 className="text-5xl font-display font-extrabold text-neo-black mb-4 text-center">
              Get Started
            </h1>
            <p className="text-center text-gray-700 text-lg">
              Sign in or create an account to continue.
            </p>
          </div>

          {/* GoogleAuth button wrapper */}
          <div className="w-full relative">
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
               {loading && <Loader2 className="w-5 h-5 animate-spin text-neo-black" />}
             </div>
             <div className={`flex justify-center w-full [&_iframe]:w-full [&>div]:w-full ${loading ? 'opacity-50' : ''}`}>
               <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setStatus({ type: "error", message: "Google Login Failed" })}
                  useOneTap
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
               />
             </div>
          </div>

          <div className="flex items-center">
            <div className="flex-grow border-t-4 border-neo-black" />
            <span className="mx-4 font-heavy text-lg text-neo-black">OR</span>
            <div className="flex-grow border-t-4 border-neo-black" />
          </div>

          <form className="space-y-6" onSubmit={handleEmailLogin}>
            <div>
              <label htmlFor="email" className="block text-lg font-heavy text-neo-black mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                className="input-neo"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Очистить ошибки при вводе
                  if (status?.type === "error") {
                    setStatus(null);
                  }
                }}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-lg font-heavy text-neo-black mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="input-neo"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  // Очистить ошибки при вводе
                  if (status?.type === "error") {
                    setStatus(null);
                  }
                }}
                required
                minLength={6}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button type="submit" className="btn-neo-main w-full text-lg disabled:opacity-60" disabled={loading}>
                Login
              </button>
              <button
                type="button"
                className="btn-neo-black w-full text-lg disabled:opacity-60"
                onClick={handleEmailSignup}
                disabled={loading}
              >
                Sign Up
              </button>
            </div>
          </form>

          <div className="text-center">
            <button
              type="button"
              className="font-bold text-neo-black hover:text-neo-main underline decoration-4"
              onClick={handlePasswordReset}
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>

        </div>
      </main>

      <NeoFooter />
    </NeoPage>
  );
};

export default LoginPage;

