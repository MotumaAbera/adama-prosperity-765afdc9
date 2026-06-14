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

    // Create the user with their chosen password, but require email confirmation
    // before they can sign in.
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
      user_metadata: { full_name: data.full_name },
    });
    if (createError) throw createError;
    if (!created.user) throw new Error("User creation failed");

    const newUserId = created.user.id;

    // Trigger the confirmation email by generating a signup link
    // (GoTrue sends the email via the configured SMTP/templates).
    const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: data.email,
      password: data.password,
      options: { redirectTo },
    });
    if (linkError) throw linkError;

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
