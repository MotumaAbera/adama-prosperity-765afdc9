import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logoAsset from "@/assets/logo.png.asset.json";
import bgAsset from "@/assets/auth-bg.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  if (session) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgAsset.url})` }}
    >
        <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-xl shadow-2xl px-8 py-10">
          <div className="flex justify-center mb-6 opacity-80">
            <img src={logoAsset.url} alt="Logo" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-brand text-center mb-8">Login</h1>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-5 pr-10 rounded-full border border-brand/60 bg-transparent text-brand placeholder:text-brand/70 focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand" />
            </div>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-5 pr-10 rounded-full border border-brand/60 bg-transparent text-brand placeholder:text-brand/70 focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand" />
            </div>

            <div className="flex items-center justify-between text-xs text-brand/90 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-sm border-brand/60 accent-brand"
                />
                Remember Me
              </label>
              <button type="button" className="hover:underline">Forgot Password?</button>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-full bg-brand hover:bg-brand/90 text-white font-medium shadow-md border border-brand/80"
            >
              {busy ? "Please wait…" : "Sign in"}
            </Button>

            <p className="text-center text-xs text-brand/80 pt-1">
              Don&apos;t have an account?{" "}
              <button type="button" className="text-brand hover:underline">Register</button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
