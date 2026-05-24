import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState<LoginForm>({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Get redirect path from location state
  const from = (location.state as { from?: string })?.from || "/dashboard";

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!form.password) {
      newErrors.password = "Password is required.";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call - replace with Zustand auth store:
      // const { login } = useAuthStore();
      // await login(form.email, form.password);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulated success - in production this would come from the store
      const success = true;

      if (success) {
        navigate(from, { replace: true });
      } else {
        setErrors({
          general: "Invalid email or password. Please try again.",
        });
      }
    } catch (err) {
      setErrors({
        general: "An error occurred. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof LoginForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0f2240] to-[#0a1628]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-3xl" />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={isLoaded ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/20 mb-4">
            <Shield className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-sm text-gray-400 mt-1">
            Sign in to access the Missing Person Detection System
          </p>
        </div>

        {/* Login card - dark glassmorphism */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20">
          {/* General error */}
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 mb-5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errors.general}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm text-gray-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="login-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`w-full py-3 pl-11 pr-4 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none transition-colors ${
                    errors.email
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-white/10 focus:border-blue-500/50"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`w-full py-3 pl-11 pr-12 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none transition-colors ${
                    errors.password
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-white/10 focus:border-blue-500/50"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Remember me & forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={(e) => handleChange("rememberMe", e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-300">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Create one now
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          By signing in, you agree to our{" "}
          <Link to="/terms" className="text-gray-500 hover:text-gray-400 underline transition-colors">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-gray-500 hover:text-gray-400 underline transition-colors">
            Privacy Policy
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
