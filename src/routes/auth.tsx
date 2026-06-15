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
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="h-16 w-16 rounded-xl bg-white/30 border border-white/20 flex items-center justify-center mb-3 shadow-md overflow-hidden">
              <img src={logoAsset.url} alt="Adama City Prosperity Party logo" className="h-12 w-12 object-contain" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">Login</h1>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/15 border border-white/15 backdrop-blur-md text-slate-800 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white/70"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/15 border border-white/15 backdrop-blur-md text-slate-800 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white/70"
              />
            </div>

            <div className="flex items-center justify-between text-sm text-slate-700 rounded-xl bg-white/15 border border-white/15 backdrop-blur-md px-4 py-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-white/60 accent-slate-700"
                />
                Remember Me
              </label>
              <button type="button" className="hover:underline">Forgot Password?</button>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-xl bg-white/25 hover:bg-white/50 text-slate-800 font-medium shadow-md"
            >
              {busy ? "Please wait…" : "Submit"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
