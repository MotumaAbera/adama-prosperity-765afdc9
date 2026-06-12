import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subcities")({
  ssr: false,
  component: SubcitiesPage,
});

function SubcitiesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["subs-admin"],
    queryFn: async () => {
      const { data: subs } = await db.from("subcities").select("*").order("name");
      const { data: wors } = await db.from("woredas").select("subcity_id");
      return (subs ?? []).map((s: any) => ({
        ...s, woreda_count: (wors ?? []).filter((w: any) => w.subcity_id === s.id).length,
      }));
    },
  });

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await db.from("subcities").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    toast.success("Subcity added");
    setName("");
    qc.invalidateQueries({ queryKey: ["subs-admin"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete subcity? Woredas under it will also be removed.")) return;
    const { error } = await db.from("subcities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["subs-admin"] });
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Subcities</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Add Subcity</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Subcity name" />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Woredas</TableHead><TableHead className="w-32 text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {data?.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.woreda_count}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost"><Link to="/woredas"><MapPin className="h-4 w-4 mr-1" />Manage</Link></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
