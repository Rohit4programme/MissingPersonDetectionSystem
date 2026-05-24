import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  UserPlus,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
  general?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 4) return { score, label: "Fair", color: "bg-amber-500" };
  if (score <= 5) return { score, label: "Good", color: "bg-blue-500" };
  return { score, label: "Strong", color: "bg-emerald-500" };
}

const PASSWORD_REQUIREMENTS = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
];

// ─── Component ──────────────────────────────────────────────────────────────

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const passwordStrength = getPasswordStrength(form.password);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Full name is required.";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (form.phone && !/^[+]?[\d\s()-]{7,20}$/.test(form.phone)) {
      newErrors.phone = "Please enter a valid phone number.";
    }

    if (!form.password) {
      newErrors.password = "Password is required.";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!form.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms and conditions.";
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
      // const { register } = useAuthStore();
      // await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      await new Promise((resolve) => setTimeout(resolve, 1800));

      // Simulated success - navigate to login with success message
      navigate("/login", {
        state: { message: "Registration successful. Please sign in." },
      });
    } catch (err) {
      setErrors({
        general: "Registration failed. This email may already be registered.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = <K extends keyof RegisterForm>(
    field: K,
    value: RegisterForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      });
    }
  };

  const inputClasses = (hasError: boolean) =>
    `w-full py-3 pl-11 pr-4 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none transition-colors ${
      hasError
        ? "border-red-500/50 focus:border-red-500"
        : "border-white/10 focus:border-blue-500/50"
    }`;

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0f2240] to-[#0a1628]" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-600/5 blur-3xl" />

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
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-gray-400 mt-1">
            Join the Missing Person Detection System
          </p>
        </div>

        {/* Register card - dark glassmorphism */}
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
            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="block text-sm text-gray-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="reg-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  className={inputClasses(!!errors.name)}
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-sm text-gray-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputClasses(!!errors.email)}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="reg-phone" className="block text-sm text-gray-400 mb-1.5">
                Phone Number <span className="text-gray-600">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="reg-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  autoComplete="tel"
                  className={inputClasses(!!errors.phone)}
                />
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-xs text-red-400">{errors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-sm text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
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

              {/* Password strength indicator */}
              {form.password.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{
                          width: `${(passwordStrength.score / 6) * 100}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.score <= 2
                          ? "text-red-400"
                          : passwordStrength.score <= 4
                          ? "text-amber-400"
                          : passwordStrength.score <= 5
                          ? "text-blue-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {PASSWORD_REQUIREMENTS.map((req) => {
                      const met = req.test(form.password);
                      return (
                        <div
                          key={req.label}
                          className={`flex items-center gap-1.5 text-xs ${
                            met ? "text-emerald-400" : "text-gray-600"
                          }`}
                        >
                          {met ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-gray-600" />
                          )}
                          {req.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm-password" className="block text-sm text-gray-400 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={`w-full py-3 pl-11 pr-12 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none transition-colors ${
                    errors.confirmPassword
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-white/10 focus:border-blue-500/50"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword}</p>
              )}
              {form.confirmPassword && form.password === form.confirmPassword && (
                <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Terms acceptance */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => handleChange("acceptTerms", e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-300 leading-relaxed">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="text-blue-400 hover:text-blue-300 underline transition-colors"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="text-blue-400 hover:text-blue-300 underline transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="mt-1.5 text-xs text-red-400 ml-7">{errors.acceptTerms}</p>
              )}
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
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
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

          {/* Login link */}
          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Your data is protected and will only be used for the Missing Person
          Detection System.
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
