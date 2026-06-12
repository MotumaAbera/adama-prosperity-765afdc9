import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/woredas")({
  ssr: false,
  component: WoredasPage,
});

function WoredasPage() {
  const qc = useQueryClient();
  const [sub, setSub] = useState<string>("");
  const [count, setCount] = useState(1);

  const { data: subs } = useQuery({ queryKey: ["subs"], queryFn: async () => (await db.from("subcities").select("*").order("name")).data ?? [] });
  const { data: wors, isLoading } = useQuery({
    queryKey: ["wors", sub], enabled: !!sub,
    queryFn: async () => (await db.from("woredas").select("*").eq("subcity_id", sub).order("name")).data ?? [],
  });

  const bulkAdd = async () => {
    if (!sub || count < 1) return;
    const existing = wors?.length ?? 0;
    const rows = Array.from({ length: count }, (_, i) => ({
      subcity_id: sub, name: `Woreda ${existing + i + 1}`,
    }));
    const { error } = await db.from("woredas").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${count} woreda(s) added`);
    qc.invalidateQueries({ queryKey: ["wors", sub] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete woreda?")) return;
    const { error } = await db.from("woredas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["wors", sub] });
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Woredas</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Woredas</CardTitle>
          <CardDescription>Choose a subcity and how many woredas to add. They will be named Woreda 1, Woreda 2, …</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-2">
          <Select value={sub} onValueChange={setSub}>
            <SelectTrigger><SelectValue placeholder="Select subcity" /></SelectTrigger>
            <SelectContent>{subs?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          <Button onClick={bulkAdd} disabled={!sub}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </CardContent>
      </Card>
      {sub && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
                {!isLoading && wors?.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">No woredas yet.</TableCell></TableRow>}
                {wors?.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.name}</TableCell>
                    <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => remove(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
