import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { db, type AppRole } from "./db";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  subcity_id: string | null;
  woreda_id: string | null;
  is_active: boolean;
};

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      db.from("profiles").select("*").eq("id", uid).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(p ?? null);
    setRoles((r ?? []).map((x: any) => x.role));
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) await loadUserData(data.session.user.id);
    else { setProfile(null); setRoles([]); }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadUserData(s.user.id), 0);
      } else {
        setProfile(null); setRoles([]);
      }
    });
    refresh().finally(() => setLoading(false));
    return () => sub.subscription.unsubscribe();
  }, []);

  const primaryRole: AppRole | null = roles.includes("super_admin") ? "super_admin"
    : roles.includes("city_admin") ? "city_admin"
    : roles.includes("subcity_admin") ? "subcity_admin"
    : roles.includes("woreda_officer") ? "woreda_officer"
    : roles.includes("viewer") ? "viewer"
    : null;

  return (
    <Ctx.Provider value={{
      session, user: session?.user ?? null, profile, roles, primaryRole, loading, refresh,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
