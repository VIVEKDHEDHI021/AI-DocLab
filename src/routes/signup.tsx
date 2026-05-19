import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: SignupPage,
  head: () => ({ meta: [{ title: "Create account — Vault" }] }),
});

function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (username.trim().length < 2) { setError("Username must be at least 2 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { username: username.trim() },
      },
    });
    setLoading(false);

    if (authError) { setError(authError.message); toast.error(authError.message); return; }
    if (data.session) {
      toast.success("Account created! Welcome to Vault.");
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Check your email to confirm your account.");
    }
  };

  const pwsMatch = confirmPassword && confirmPassword === password;
  const pwsMismatch = confirmPassword && confirmPassword !== password;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex">
      <div className="pointer-events-none fixed inset-0 bg-mesh" />
      <div className="pointer-events-none fixed inset-0 bg-hero-glow" />

      {/* Left panel */}
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden border-r border-white/5 p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/15 via-transparent to-indigo-600/10" />

        <div className="relative flex items-center gap-2.5 select-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-xl font-bold text-white">Vault</span>
        </div>

        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
            ✦ Free forever for personal use
          </div>
          <h2 className="font-display text-4xl font-bold text-white leading-[1.1] text-balance">
            Start organizing<br />your documents.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-xs">
            Your files are stored in your own Google Drive. We only store AI-generated metadata. No file limits.
          </p>

          <div className="mt-10 space-y-3">
            {[
              "No credit card required",
              "100% private — your data stays yours",
              "AI extraction of IDs, PAN, Aadhaar numbers",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
                  <svg className="h-2.5 w-2.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Vault — Secure AI Document Wallet
        </p>
      </div>

      {/* Right panel — form */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 md:p-10">
        <Link to="/" className="mb-10 flex items-center gap-2 select-none lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-xl font-bold text-white">Vault</span>
        </Link>

        <div className="w-full max-w-[400px] space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-white tracking-tight">Create your Vault</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Free forever for personal use.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/8 px-3.5 py-2.5 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium text-foreground/80">Your name</Label>
              <Input
                id="username"
                type="text"
                placeholder="Vivek"
                required
                minLength={2}
                value={username}
                onChange={(e) => { clearError(); setUsername(e.target.value); }}
                className="h-11 bg-surface border-white/8 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-violet-500/50 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => { clearError(); setEmail(e.target.value); }}
                className="h-11 bg-surface border-white/8 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-violet-500/50 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { clearError(); setPassword(e.target.value); }}
                  className="h-11 bg-surface border-white/8 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-violet-500/50 rounded-xl pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground/80">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { clearError(); setConfirmPassword(e.target.value); }}
                  className={`h-11 bg-surface border-white/8 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-violet-500/50 rounded-xl pr-10 ${
                    pwsMismatch ? "border-red-500/50" : pwsMatch ? "border-emerald-500/50" : ""
                  }`}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwsMismatch && <p className="text-xs text-red-400">Passwords do not match</p>}
              {pwsMatch && <p className="text-xs text-emerald-400">✓ Passwords match</p>}
            </div>

            <Button
              type="submit"
              className="mt-2 w-full h-11 bg-gradient-primary text-white shadow-glow hover:opacity-90 transition-opacity font-semibold rounded-xl"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-violet-400 hover:text-violet-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
