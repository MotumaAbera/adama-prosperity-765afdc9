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
import {
  Download, Trash2, Search, Archive, FileText, FileImage, FileVideo, FileAudio,
  FileSpreadsheet, FileCode, FileType, File, Folder, FolderOpen, ArrowLeft,
  Briefcase, Scale, Landmark, GraduationCap, HeartPulse, Wallet, Building2,
  ClipboardList, ShieldCheck, BookOpen, Hammer, Leaf, Megaphone, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/documents")({
  ssr: false,
  component: DocumentsPage,
});

function docIcon(fileName?: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  const common: Record<string, React.ComponentType<{ className?: string }>> = {
    pdf: FileText,
    doc: FileType, docx: FileType, odt: FileType, rtf: FileType,
    xls: FileSpreadsheet, xlsx: FileSpreadsheet, csv: FileSpreadsheet, ods: FileSpreadsheet,
    ppt: FileText, pptx: FileText, odp: FileText,
    jpg: FileImage, jpeg: FileImage, png: FileImage, gif: FileImage, webp: FileImage, svg: FileImage, bmp: FileImage,
    mp4: FileVideo, mov: FileVideo, avi: FileVideo, mkv: FileVideo, webm: FileVideo,
    mp3: FileAudio, wav: FileAudio, ogg: FileAudio, flac: FileAudio, aac: FileAudio,
    zip: File, rar: File, "7z": File, tar: File, gz: File,
    js: FileCode, ts: FileCode, jsx: FileCode, tsx: FileCode, py: FileCode, java: FileCode, c: FileCode, cpp: FileCode, h: FileCode, go: FileCode, rs: FileCode, php: FileCode, html: FileCode, css: FileCode, sql: FileCode,
    json: FileCode, xml: FileCode, yaml: FileCode, yml: FileCode, toml: FileCode,
    txt: FileText, md: FileText, log: FileText,
  };
  return common[ext] ?? FileText;
}

const CONF_COLOR: Record<string, string> = {
  "Public": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  "Internal": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
  "Restricted": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  "Confidential": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  "Top Secret": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
};

// Pick an icon + color theme for a category based on its name/code
function categoryTheme(name: string, code?: string) {
  const key = `${code ?? ""} ${name}`.toLowerCase();
  const themes: { match: RegExp; icon: React.ComponentType<{ className?: string }>; tint: string; ring: string }[] = [
    { match: /(legal|law|justice|court)/, icon: Scale, tint: "from-amber-500/15 to-amber-500/5 text-amber-600", ring: "ring-amber-500/20" },
    { match: /(finance|budget|account|revenue|tax)/, icon: Wallet, tint: "from-emerald-500/15 to-emerald-500/5 text-emerald-600", ring: "ring-emerald-500/20" },
    { match: /(health|medical|clinic|hospital)/, icon: HeartPulse, tint: "from-rose-500/15 to-rose-500/5 text-rose-600", ring: "ring-rose-500/20" },
    { match: /(education|school|training|academic)/, icon: GraduationCap, tint: "from-indigo-500/15 to-indigo-500/5 text-indigo-600", ring: "ring-indigo-500/20" },
    { match: /(infrastructure|construction|engineer|build)/, icon: Hammer, tint: "from-orange-500/15 to-orange-500/5 text-orange-600", ring: "ring-orange-500/20" },
    { match: /(environment|agri|green|land)/, icon: Leaf, tint: "from-lime-500/15 to-lime-500/5 text-lime-600", ring: "ring-lime-500/20" },
    { match: /(security|safety|police|defense)/, icon: ShieldCheck, tint: "from-red-500/15 to-red-500/5 text-red-600", ring: "ring-red-500/20" },
    { match: /(communication|media|press|public relation)/, icon: Megaphone, tint: "from-pink-500/15 to-pink-500/5 text-pink-600", ring: "ring-pink-500/20" },
    { match: /(hr|human resource|personnel|staff)/, icon: Users, tint: "from-violet-500/15 to-violet-500/5 text-violet-600", ring: "ring-violet-500/20" },
    { match: /(admin|government|office|cabinet)/, icon: Landmark, tint: "from-blue-500/15 to-blue-500/5 text-blue-600", ring: "ring-blue-500/20" },
    { match: /(policy|regulation|directive|guideline)/, icon: BookOpen, tint: "from-teal-500/15 to-teal-500/5 text-teal-600", ring: "ring-teal-500/20" },
    { match: /(report|record|register|archive)/, icon: ClipboardList, tint: "from-slate-500/15 to-slate-500/5 text-slate-600", ring: "ring-slate-500/20" },
    { match: /(project|plan|program)/, icon: Briefcase, tint: "from-cyan-500/15 to-cyan-500/5 text-cyan-600", ring: "ring-cyan-500/20" },
    { match: /(municipal|city|urban|housing)/, icon: Building2, tint: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-600", ring: "ring-fuchsia-500/20" },
  ];
  return themes.find(t => t.match.test(key)) ?? { icon: Folder, tint: "from-primary/15 to-primary/5 text-primary", ring: "ring-primary/20" };
}

function DocumentsPage() {
  const { user, primaryRole } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [sub, setSub] = useState("all");
  const [conf, setConf] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [openCat, setOpenCat] = useState<string | null>(null); // null = grid; "__uncat" = uncategorized
  const admin = isAdminRole(primaryRole);

  const { data: cats } = useQuery({ queryKey: ["cats"], queryFn: async () => (await db.from("categories").select("id,name,code").order("code", { ascending: true })).data ?? [] });
  const { data: subs } = useQuery({ queryKey: ["subs"], queryFn: async () => (await db.from("subcities").select("id,name").order("name")).data ?? [] });
  const { data: wors } = useQuery({ queryKey: ["all-wors"], queryFn: async () => (await db.from("woredas").select("id,name")).data ?? [] });

  const { data: docs, isLoading } = useQuery({
    queryKey: ["docs", showArchived],
    queryFn: async () => {
      const { data } = await db.from("documents")
        .select("*")
        .eq("is_archived", showArchived)
        .order("created_at", { ascending: false }).limit(1000);
      return data ?? [];
    },
  });

  // Apply search + subcity filters once; reused by folders and detail view
  const filteredAll = useMemo(() => {
    return (docs ?? []).filter((d: any) => {
      if (sub !== "all" && d.subcity_id !== sub) return false;
      if (conf !== "all" && d.confidentiality_level !== conf) return false;
      if (q) {
        const s = q.toLowerCase();
        const hit = d.title?.toLowerCase().includes(s)
          || d.document_number?.toLowerCase().includes(s)
          || d.description?.toLowerCase().includes(s)
          || d.file_name?.toLowerCase().includes(s)
          || (d.tags || []).some((t: string) => t.toLowerCase().includes(s));
        if (!hit) return false;
      }
      return true;
    });
  }, [docs, q, sub, conf]);

  // Group by category
  const folders = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const d of filteredAll) {
      const key = d.category_id || "__uncat";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    const list: { id: string; name: string; code?: string; docs: any[] }[] = (cats ?? []).map((c: any) => ({
      id: c.id as string,
      name: c.name as string,
      code: c.code as string | undefined,
      docs: map.get(c.id) ?? [],
    }));
    const uncat = map.get("__uncat");
    if (uncat && uncat.length) list.push({ id: "__uncat", name: "Uncategorized", code: undefined, docs: uncat });
    // If searching, hide empty folders so results stand out
    return q ? list.filter(f => f.docs.length > 0) : list;
  }, [filteredAll, cats, q]);

  const subName = (id: string) => subs?.find((s: any) => s.id === id)?.name ?? "—";
  const worName = (id: string) => wors?.find((w: any) => w.id === id)?.name ?? "—";

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

  const currentFolder = openCat ? folders.find(f => f.id === openCat) : null;
  const totalDocs = filteredAll.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">
            {showArchived ? "Archived Documents" : "Documents"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentFolder
              ? `${currentFolder.docs.length} document(s) in ${currentFolder.name}`
              : `${folders.length} folder(s) · ${totalDocs} document(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentFolder && (
            <Button variant="outline" size="sm" onClick={() => setOpenCat(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> All folders
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="h-4 w-4 mr-1" />{showArchived ? "Show Active" : "Show Archived"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" /> Search across folders
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <Input
            placeholder="Search title, number, file name, tags…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select value={sub} onValueChange={setSub}>
            <SelectTrigger><SelectValue placeholder="All subcities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subcities</SelectItem>
              {subs?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* FOLDER GRID VIEW */}
      {!currentFolder && (
        <>
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl border bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && folders.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Folder className="h-10 w-10 mx-auto mb-3 opacity-50" />
                No folders match your search.
              </CardContent>
            </Card>
          )}
          {!isLoading && folders.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {folders.map((f) => {
                const theme = categoryTheme(f.name, f.code);
                const Icon = theme.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setOpenCat(f.id)}
                    className={`group relative overflow-hidden rounded-xl border bg-card text-left transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 ring-1 ${theme.ring} focus:outline-none focus:ring-2 focus:ring-primary`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.tint} opacity-60 pointer-events-none`} />
                    <div className="relative p-5 flex flex-col h-full min-h-[10rem]">
                      <div className="flex items-start justify-between">
                        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-background/80 backdrop-blur ${theme.tint.split(" ").pop()} shadow-sm`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {f.docs.length}
                        </Badge>
                      </div>
                      <div className="mt-4">
                        <div className="font-semibold leading-tight line-clamp-2">{f.name}</div>
                        {f.code && (
                          <div className="mt-0.5 text-xs text-muted-foreground font-mono">{f.code}</div>
                        )}
                      </div>
                      <div className="mt-auto pt-3 flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Open folder
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* FOLDER DETAIL VIEW */}
      {currentFolder && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subcity</TableHead>
                  <TableHead>Woreda</TableHead>
                  <TableHead>Confidentiality</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentFolder.docs.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No documents in this folder.
                  </TableCell></TableRow>
                )}
                {currentFolder.docs.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium max-w-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {(() => {
                          const Icon = docIcon(d.file_name);
                          return <Icon className="h-4 w-4 shrink-0 text-[#3e7edd]" />;
                        })()}
                        <span className="truncate">{d.title}</span>
                      </div>
                      {d.document_number && <div className="text-xs text-muted-foreground pl-6">#{d.document_number}</div>}
                    </TableCell>
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
      )}
    </div>
  );
}
