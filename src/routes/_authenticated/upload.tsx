import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db, CONFIDENTIALITY_LEVELS, logActivity } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Upload as UploadIcon, FileUp, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/upload")({
  ssr: false,
  component: UploadPage,
});

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip";

function slug(s: string) { return s.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 50); }

function UploadPage() {
  const { user, profile, primaryRole } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "", document_number: "", description: "",
    category_id: "", subcity_id: "", woreda_id: "",
    document_date: new Date().toISOString().slice(0, 10),
    confidentiality_level: "Internal", tags: "",
  });

  const isWoredaOfficer = primaryRole === "woreda_officer";
  const isSubcityAdmin = primaryRole === "subcity_admin";
  const isCityLevel = primaryRole === "super_admin" || primaryRole === "city_admin";
  const lockSubcity = (isSubcityAdmin || isWoredaOfficer) && !!profile?.subcity_id;
  const lockWoreda = isWoredaOfficer && !!profile?.woreda_id;

  const levelLabel = isCityLevel ? "City" : isSubcityAdmin ? "Subcity" : isWoredaOfficer ? "Woreda" : "—";

  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      ...f,
      subcity_id: isCityLevel ? "" : (lockSubcity && profile.subcity_id ? profile.subcity_id : f.subcity_id),
      woreda_id: isCityLevel ? "" : (lockWoreda && profile.woreda_id ? profile.woreda_id : f.woreda_id),
    }));
  }, [profile, lockSubcity, lockWoreda, isCityLevel]);


  const { data: cats } = useQuery({ queryKey: ["cats"], queryFn: async () => (await db.from("categories").select("id,name").order("name")).data ?? [] });
  const { data: subs } = useQuery({ queryKey: ["subs"], queryFn: async () => (await db.from("subcities").select("id,name").order("name")).data ?? [] });
  const { data: wors } = useQuery({
    queryKey: ["wors", form.subcity_id], enabled: !!form.subcity_id,
    queryFn: async () => (await db.from("woredas").select("id,name").eq("subcity_id", form.subcity_id).order("name")).data ?? [],
  });

  const allowedSubs = useMemo(() => {
    if (lockSubcity && profile?.subcity_id) return (subs ?? []).filter((s: any) => s.id === profile.subcity_id);
    return subs ?? [];
  }, [subs, lockSubcity, profile?.subcity_id]);

  const allowedWors = useMemo(() => {
    if (lockWoreda && profile?.woreda_id) return (wors ?? []).filter((w: any) => w.id === profile.woreda_id);
    return wors ?? [];
  }, [wors, lockWoreda, profile?.woreda_id]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFiles(Array.from(e.dataTransfer.files));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (files.length === 0) return toast.error("Please choose at least one file");
    if (!form.title || !form.category_id) return toast.error("Title and category are required");
    if (isCityLevel) {
      // City-level uploads: ignore any subcity/woreda
      form.subcity_id = "";
      form.woreda_id = "";
    } else if (isWoredaOfficer) {
      if (form.subcity_id !== profile?.subcity_id || form.woreda_id !== profile?.woreda_id) {
        return toast.error("Woreda officers can only upload to their assigned woreda");
      }
    } else if (isSubcityAdmin) {
      if (form.subcity_id !== profile?.subcity_id) {
        return toast.error("Subcity admins can only upload within their subcity");
      }
    }


    setBusy(true);
    try {
      const sub = subs?.find((s: any) => s.id === form.subcity_id);
      const wor = wors?.find((w: any) => w.id === form.woreda_id);
      const cat = cats?.find((c: any) => c.id === form.category_id);

      for (const file of files) {
        const levelFolder = isCityLevel ? "city" : isSubcityAdmin ? "subcity" : "woreda";
        const folder = `${levelFolder}/${slug(sub?.name || "_")}/${slug(wor?.name || "_")}/${slug(cat?.name || "_")}`;
        const path = `${folder}/${Date.now()}_${slug(file.name)}`;


        const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (upErr) throw upErr;

        const { data: doc, error: insErr } = await db.from("documents").insert({
          title: files.length > 1 ? `${form.title} — ${file.name}` : form.title,
          document_number: form.document_number || null,
          description: form.description || null,
          category_id: form.category_id || null,
          subcity_id: form.subcity_id || null,
          woreda_id: form.woreda_id || null,
          uploaded_by: user.id,
          document_date: form.document_date,
          confidentiality_level: form.confidentiality_level,
          tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          file_type: file.type || file.name.split(".").pop() || "",
        }).select("id").single();
        if (insErr) throw insErr;

        await logActivity("upload", user.id, doc.id, { file: file.name });
      }
      toast.success(`${files.length} document(s) uploaded`);
      navigate({ to: "/documents" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Document</h1>
        <p className="text-sm text-muted-foreground">Add new documents to the repository</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5" /> Files</CardTitle>
            <CardDescription>Drag and drop or click to browse. PDF, DOC, XLS, PPT, images, ZIP up to ~50MB.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition"
            >
              <UploadIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">{ACCEPT}</p>
              <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </div>
            {files.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {files.map((f) => (
                  <li key={f.name} className="flex justify-between text-muted-foreground"><span className="truncate">{f.name}</span><span>{(f.size / 1024).toFixed(1)} KB</span></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Document Title *</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Document Number</Label>
              <Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Document Date</Label>
              <Input type="date" value={form.document_date} onChange={(e) => setForm({ ...form, document_date: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{cats?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Confidentiality Level</Label>
              <Select value={form.confidentiality_level} onValueChange={(v) => setForm({ ...form, confidentiality_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONFIDENTIALITY_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">Subcity {lockSubcity && <Lock className="h-3 w-3 text-muted-foreground" />}</Label>
              <Select value={form.subcity_id} onValueChange={(v) => setForm({ ...form, subcity_id: v, woreda_id: "" })} disabled={lockSubcity}>
                <SelectTrigger><SelectValue placeholder="Select subcity" /></SelectTrigger>
                <SelectContent>{allowedSubs.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              {lockSubcity && <p className="text-xs text-muted-foreground">Locked to your assigned subcity.</p>}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">Woreda {lockWoreda && <Lock className="h-3 w-3 text-muted-foreground" />}</Label>
              <Select value={form.woreda_id} onValueChange={(v) => setForm({ ...form, woreda_id: v })} disabled={!form.subcity_id || lockWoreda}>
                <SelectTrigger><SelectValue placeholder={form.subcity_id ? "Select woreda (optional)" : "Pick subcity first"} /></SelectTrigger>
                <SelectContent>{allowedWors.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
              {lockWoreda && <p className="text-xs text-muted-foreground">Locked to your assigned woreda.</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Tags / Keywords (comma-separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="planning, 2018, monthly" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/documents" })}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload Document"}</Button>
        </div>
      </form>
    </div>
  );
}
