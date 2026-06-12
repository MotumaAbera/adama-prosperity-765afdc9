import { supabase } from "@/integrations/supabase/client";

// Untyped helper: Supabase type generation hasn't caught up to the new tables yet.
// RLS still enforces all access; this just relaxes the TS surface for queries.
export const db = supabase as unknown as {
  from: (table: string) => any;
  storage: typeof supabase.storage;
  auth: typeof supabase.auth;
  rpc: typeof supabase.rpc;
};

export type AppRole = "super_admin" | "city_admin" | "subcity_admin" | "woreda_officer" | "viewer";

export const CONFIDENTIALITY_LEVELS = ["Public", "Internal", "Restricted", "Confidential", "Top Secret"] as const;
export type ConfidentialityLevel = (typeof CONFIDENTIALITY_LEVELS)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  city_admin: "City Admin",
  subcity_admin: "Subcity Admin",
  woreda_officer: "Woreda Officer",
  viewer: "Viewer",
};

export function isAdminRole(role?: AppRole | null) {
  return role === "super_admin" || role === "city_admin";
}

export async function logActivity(
  action: string,
  userId: string,
  documentId?: string | null,
  details?: Record<string, unknown>,
) {
  try {
    await db.from("activity_logs").insert({
      user_id: userId,
      document_id: documentId ?? null,
      action,
      details: details ?? null,
    });
  } catch (e) {
    console.error("logActivity failed", e);
  }
}
