import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, ROLE_LABELS, type AppRole } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/users")({
  ssr: false,
  component: UsersPage,
});

const ROLES: AppRole[] = ["super_admin", "city_admin", "subcity_admin", "woreda_officer", "viewer"];

function UsersPage() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: subs }, { data: wors }] = await Promise.all([
        db.from("profiles").select("*").order("created_at", { ascending: false }),
        db.from("user_roles").select("*"),
        db.from("subcities").select("id,name"),
        db.from("woredas").select("id,name"),
      ]);
      return (profiles ?? []).map((p: any) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role as AppRole),
        subcity: subs?.find((s: any) => s.id === p.subcity_id)?.name,
        woreda: wors?.find((w: any) => w.id === p.woreda_id)?.name,
      }));
    },
  });
  const { data: subs } = useQuery({ queryKey: ["subs"], queryFn: async () => (await db.from("subcities").select("id,name").order("name")).data ?? [] });

  const setRole = async (userId: string, role: AppRole) => {
    await db.from("user_roles").delete().eq("user_id", userId);
    const { error } = await db.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    qc.invalidateQueries({ queryKey: ["users-admin"] });
  };

  const setSubcity = async (userId: string, subcity_id: string | null) => {
    const { error } = await db.from("profiles").update({ subcity_id }).eq("id", userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["users-admin"] });
  };

  const toggleActive = async (userId: string, is_active: boolean) => {
    const { error } = await db.from("profiles").update({ is_active }).eq("id", userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["users-admin"] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">Assign roles and scope user access</p>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Subcity</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {users?.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.full_name || u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    {u.roles?.includes("super_admin") && <Badge className="mt-1" variant="secondary">Super Admin</Badge>}
                  </TableCell>
                  <TableCell>
                    <Select value={u.roles?.[0] ?? ""} onValueChange={(v) => setRole(u.id, v as AppRole)}>
                      <SelectTrigger className="w-44"><SelectValue placeholder="Set role" /></SelectTrigger>
                      <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={u.subcity_id ?? ""} onValueChange={(v) => setSubcity(u.id, v || null)}>
                      <SelectTrigger className="w-44"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{subs?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Switch checked={u.is_active} onCheckedChange={(v) => toggleActive(u.id, v)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
