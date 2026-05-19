import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, AlertCircle, User, Mail, KeyRound } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (username.trim().length < 2) {
      setError("Username must be at least 2 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

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

    if (authError) {
      setError(authError.message);
      toast.error(authError.message);
      return;
    }
    if (data.session) {
      toast.success("Account created! Welcome to Vault.");
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Check your email to confirm your account.");
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-mesh opacity-30" aria-hidden />
        <div className="relative z-10 mx-auto max-w-lg text-center">
          <Lock className="mx-auto h-16 w-16 opacity-80" />
          <h2 className="mt-6 font-display text-4xl font-bold tracking-tight">Your Intelligent Vault</h2>
          <p className="mt-4 text-lg text-primary-foreground/80">Securely store, organize, and instantly search through your most important documents with AI.</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center bg-background p-6 md:p-10">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Lock className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">Vault</span>
          </Link>

          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Create your Vault</h1>
            <p className="mt-2 text-sm text-muted-foreground">Free forever for personal use.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    required
                    minLength={2}
                    className="pl-9 bg-surface/50"
                    value={username}
                    onChange={e => { clearError(); setUsername(e.target.value); }}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="pl-9 bg-surface/50"
                    value={email}
                    onChange={e => { clearError(); setEmail(e.target.value); }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    className="pl-9 bg-surface/50"
                    value={password}
                    onChange={e => { clearError(); setPassword(e.target.value); }}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repeat your password"
                    required
                    className={`pl-9 bg-surface/50 ${
                      confirmPassword && confirmPassword !== password
                        ? "border-destructive focus-visible:ring-destructive/40"
                        : confirmPassword && confirmPassword === password
                        ? "border-green-500 focus-visible:ring-green-500/40"
                        : ""
                    }`}
                    value={confirmPassword}
                    onChange={e => { clearError(); setConfirmPassword(e.target.value); }}
                  />
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
                {confirmPassword && confirmPassword === password && (
                  <p className="text-xs text-green-600">Passwords match ✓</p>
                )}
              </div>

              <Button
                type="submit"
                className="mt-6 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
