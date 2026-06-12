import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { db, logActivity, isAdminRole } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Download, Trash2, Search, Archive, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/documents")({
  ssr: false,
  component: DocumentsPage,
});

const CONF_COLOR: Record<string, string> = {
  "Public": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  "Internal": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
  "Restricted": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  "Confidential": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  "Top Secret": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
};

function DocumentsPage() {
  const { user, primaryRole } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sub, setSub] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const admin = isAdminRole(primaryRole);

  const { data: cats } = useQuery({ queryKey: ["cats"], queryFn: async () => (await db.from("categories").select("id,name").order("name")).data ?? [] });
  const { data: subs } = useQuery({ queryKey: ["subs"], queryFn: async () => (await db.from("subcities").select("id,name").order("name")).data ?? [] });
  const { data: wors } = useQuery({ queryKey: ["all-wors"], queryFn: async () => (await db.from("woredas").select("id,name")).data ?? [] });

  const { data: docs, isLoading } = useQuery({
    queryKey: ["docs", showArchived],
    queryFn: async () => {
      const { data } = await db.from("documents")
        .select("*")
        .eq("is_archived", showArchived)
        .order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return (docs ?? []).filter((d: any) => {
      if (cat !== "all" && d.category_id !== cat) return false;
      if (sub !== "all" && d.subcity_id !== sub) return false;
      if (q) {
        const s = q.toLowerCase();
        const hit = d.title?.toLowerCase().includes(s)
          || d.document_number?.toLowerCase().includes(s)
          || d.description?.toLowerCase().includes(s)
          || (d.tags || []).some((t: string) => t.toLowerCase().includes(s));
        if (!hit) return false;
      }
      return true;
    });
  }, [docs, q, cat, sub]);

  const subName = (id: string) => subs?.find((s: any) => s.id === id)?.name ?? "—";
  const worName = (id: string) => wors?.find((w: any) => w.id === id)?.name ?? "—";
  const catName = (id: string) => cats?.find((c: any) => c.id === id)?.name ?? "—";

  const download = async (d: any) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 300);
    if (error || !data) return toast.error("Could not generate download link");
    window.open(data.signedUrl, "_blank");
    if (user) await logActivity("download", user.id, d.id, { file: d.file_name });
  };

  const archive = async (d: any) => {
    const { error } = await db.from("documents").update({ is_archived: !d.is_archived }).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success(d.is_archived ? "Restored" : "Archived");
    if (user) await logActivity(d.is_archived ? "restore" : "archive", user.id, d.id);
    qc.invalidateQueries({ queryKey: ["docs"] });
  };

  const remove = async (d: any) => {
    if (!confirm(`Delete "${d.title}"? This permanently removes the file.`)) return;
    await supabase.storage.from("documents").remove([d.file_path]);
    const { error } = await db.from("documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (user) await logActivity("delete", user.id, null, { title: d.title });
    qc.invalidateQueries({ queryKey: ["docs"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{showArchived ? "Archived Documents" : "Documents"}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} document(s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
          <Archive className="h-4 w-4 mr-1" />{showArchived ? "Show Active" : "Show Archived"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> Advanced Search</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          <Input placeholder="Search title, number, tags…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {cats?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sub} onValueChange={setSub}>
            <SelectTrigger><SelectValue placeholder="All subcities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subcities</SelectItem>
              {subs?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcity</TableHead>
                <TableHead>Woreda</TableHead>
                <TableHead>Confidentiality</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No documents found.
                </TableCell></TableRow>
              )}
              {filtered.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="truncate">{d.title}</div>
                    {d.document_number && <div className="text-xs text-muted-foreground">#{d.document_number}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{catName(d.category_id)}</TableCell>
                  <TableCell className="text-sm">{subName(d.subcity_id)}</TableCell>
                  <TableCell className="text-sm">{worName(d.woreda_id)}</TableCell>
                  <TableCell><Badge className={CONF_COLOR[d.confidentiality_level] || ""} variant="secondary">{d.confidentiality_level}</Badge></TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{d.document_date ? format(new Date(d.document_date), "PP") : "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => download(d)} title="Download"><Download className="h-4 w-4" /></Button>
                    {(d.uploaded_by === user?.id || admin) && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => archive(d)} title={d.is_archived ? "Restore" : "Archive"}><Archive className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(d)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
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
