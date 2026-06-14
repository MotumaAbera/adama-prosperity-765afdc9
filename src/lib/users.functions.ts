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
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
      user_metadata: { full_name: data.full_name },
    });
    if (createError) throw createError;
    if (!userData.user) throw new Error("User creation failed");

    const newUserId = userData.user.id;

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
