import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { db, ROLE_LABELS, type AppRole } from "@/lib/db";
import { createUser } from "@/lib/users.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/users")({
  ssr: false,
  component: UsersPage,
});

const ROLES: AppRole[] = ["super_admin", "city_admin", "subcity_admin", "woreda_officer", "viewer"];

function UsersPage() {
  const qc = useQueryClient();
  const addUser = useServerFn(createUser);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("viewer");
  const [subcityId, setSubcityId] = useState("");
  const [woredaId, setWoredaId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: subs }, { data: wors }] = await Promise.all([
        db.from("profiles").select("*").order("created_at", { ascending: false }),
        db.from("user_roles").select("*"),
        db.from("subcities").select("id,name"),
        db.from("woredas").select("id,name,subcity_id"),
      ]);
      return (profiles ?? []).map((p: any) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role as AppRole),
        subcity: subs?.find((s: any) => s.id === p.subcity_id)?.name,
        woreda: wors?.find((w: any) => w.id === p.woreda_id)?.name,
      }));
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["subs"],
    queryFn: async () => (await db.from("subcities").select("id,name").order("name")).data ?? [],
  });

  const { data: woredas } = useQuery({
    queryKey: ["woredas-all"],
    queryFn: async () => (await db.from("woredas").select("id,name,subcity_id").order("name")).data ?? [],
  });

  const filteredWoredas = subcityId
    ? (woredas ?? []).filter((w: any) => w.subcity_id === subcityId)
    : [];

  const setRoleFn = async (userId: string, newRole: AppRole) => {
    await db.from("user_roles").delete().eq("user_id", userId);
    const { error } = await db.from("user_roles").insert({ user_id: userId, role: newRole });
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

  const onAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addUser({
        data: {
          email,
          full_name: fullName,
          role,
          subcity_id: subcityId || null,
          woreda_id: woredaId || null,
        },
      });
      toast.success("Invitation sent. The user will receive an email with a link to set their password.");
      setOpen(false);
      setEmail("");
      setFullName("");
      setRole("viewer");
      setSubcityId("");
      setWoredaId("");
      qc.invalidateQueries({ queryKey: ["users-admin"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create user");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Assign roles and scope user access</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add User</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Invite a new user by email. They will receive a link to set their password and confirm their account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-fullname">Full Name</Label>
              <Input id="add-fullname" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input id="add-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger id="add-role"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-subcity">Subcity</Label>
              <Select value={subcityId} onValueChange={(v) => { setSubcityId(v); setWoredaId(""); }}>
                <SelectTrigger id="add-subcity"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{subs?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-woreda">Woreda</Label>
              <Select value={woredaId} onValueChange={(v) => setWoredaId(v)} disabled={!subcityId}>
                <SelectTrigger id="add-woreda"><SelectValue placeholder={subcityId ? "—" : "Select subcity first"} /></SelectTrigger>
                <SelectContent>{filteredWoredas.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create User"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                    <Select value={u.roles?.[0] ?? ""} onValueChange={(v) => setRoleFn(u.id, v as AppRole)}>
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
