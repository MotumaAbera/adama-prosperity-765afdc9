import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "@/lib/db";

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    email: string;
    password: string;
    full_name: string;
    role: AppRole;
    subcity_id?: string | null;
    woreda_id?: string | null;
    origin?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const origin = data.origin || process.env.SITE_URL;
    const redirectTo = origin ? `${origin.replace(/\/$/, "")}/auth` : undefined;

    // Create the user through the signup flow so the confirmation email is sent,
    // while email confirmation remains required before sign-in.
    const { data: created, error: createError } = await supabaseAdmin.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
        emailRedirectTo: redirectTo,
      },
    });
    if (createError) throw createError;
    if (!created.user) throw new Error("User creation failed");

    const newUserId = created.user.id;

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role: data.role,
    });
    if (roleError) throw roleError;

    const { error: profileError } = await supabaseAdmin.from("profiles").update({
      full_name: data.full_name,
      subcity_id: data.subcity_id ?? null,
      woreda_id: data.woreda_id ?? null,
      is_active: true,
    }).eq("id", newUserId);
    if (profileError) throw profileError;

    return { success: true, userId: newUserId };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;

    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: callerId });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    if (profileError) throw profileError;

    const { error: roleError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (roleError) throw roleError;

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authError) throw authError;

    return { success: true };
  });
