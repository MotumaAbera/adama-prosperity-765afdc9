import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db, ROLE_LABELS } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Users, Building2, MapPin, Tag, Upload, Download, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

const BRAND = "#3e7edd";
const COLORS = [BRAND, "oklch(0.7 0.14 220)", "oklch(0.65 0.15 200)", "oklch(0.6 0.16 180)", "oklch(0.55 0.18 254)"];

const ACCENTS = [
  "from-[#3e7edd]/15 to-[#3e7edd]/0 text-[#3e7edd] ring-[#3e7edd]/20",
  "from-sky-500/15 to-sky-500/0 text-sky-600 ring-sky-500/20 dark:text-sky-300",
  "from-indigo-500/15 to-indigo-500/0 text-indigo-600 ring-indigo-500/20 dark:text-indigo-300",
  "from-cyan-500/15 to-cyan-500/0 text-cyan-600 ring-cyan-500/20 dark:text-cyan-300",
  "from-violet-500/15 to-violet-500/0 text-violet-600 ring-violet-500/20 dark:text-violet-300",
  "from-emerald-500/15 to-emerald-500/0 text-emerald-600 ring-emerald-500/20 dark:text-emerald-300",
  "from-amber-500/15 to-amber-500/0 text-amber-600 ring-amber-500/20 dark:text-amber-300",
];

function StatCard({ icon: Icon, label, value, hint, accentIndex = 0 }: any) {
  const accent = ACCENTS[accentIndex % ACCENTS.length];
  return (
    <Card className="relative overflow-hidden border-border/60 hover:shadow-[var(--shadow-card)] transition-shadow">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent.split(" ").filter(c => c.startsWith("from-") || c.startsWith("to-")).join(" ")} pointer-events-none`} />
      <CardContent className="relative p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl bg-card ring-1 flex items-center justify-center shrink-0 ${accent.split(" ").filter(c => c.startsWith("text-") || c.startsWith("ring-") || c.startsWith("dark:")).join(" ")}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold tracking-tight">{value ?? "—"}</div>
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}


function Dashboard() {
  const { profile, primaryRole } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [docs, users, subs, wors, cats, downloads, todayUploads] = await Promise.all([
        db.from("documents").select("id", { count: "exact", head: true }),
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("subcities").select("id", { count: "exact", head: true }),
        db.from("woredas").select("id", { count: "exact", head: true }),
        db.from("categories").select("id", { count: "exact", head: true }),
        db.from("activity_logs").select("id", { count: "exact", head: true }).eq("action", "download"),
        db.from("documents").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      ]);
      return {
        documents: docs.count ?? 0,
        users: users.count ?? 0,
        subcities: subs.count ?? 0,
        woredas: wors.count ?? 0,
        categories: cats.count ?? 0,
        downloads: downloads.count ?? 0,
        todayUploads: todayUploads.count ?? 0,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-docs"],
    queryFn: async () => {
      const { data } = await db.from("documents")
        .select("id,title,created_at,file_type,subcity_id,category_id")
        .order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  const { data: activity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const { data } = await db.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: charts } = useQuery({
    queryKey: ["dashboard-charts"],
    queryFn: async () => {
      const [{ data: subs }, { data: cats }, { data: docs }] = await Promise.all([
        db.from("subcities").select("id,name"),
        db.from("categories").select("id,name"),
        db.from("documents").select("subcity_id,category_id,created_at"),
      ]);
      const bySubcity = (subs ?? []).map((s: any) => ({
        name: s.name,
        count: (docs ?? []).filter((d: any) => d.subcity_id === s.id).length,
      }));
      const byCategory = (cats ?? []).slice(0, 8).map((c: any) => ({
        name: c.name.length > 22 ? c.name.slice(0, 22) + "…" : c.name,
        count: (docs ?? []).filter((d: any) => d.category_id === c.id).length,
      }));
      const monthly: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        monthly[format(d, "MMM")] = 0;
      }
      (docs ?? []).forEach((d: any) => {
        const k = format(new Date(d.created_at), "MMM");
        if (k in monthly) monthly[k]++;
      });
      const trend = Object.entries(monthly).map(([month, count]) => ({ month, count }));
      return { bySubcity, byCategory, trend };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {profile?.full_name || profile?.email}</h1>
        <p className="text-sm text-muted-foreground">
          {primaryRole ? ROLE_LABELS[primaryRole] : "No role"} · Adama City Prosperity Party · Document Management
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={FileText} label="Total Documents" value={stats?.documents} />
        <StatCard icon={Users} label="Total Users" value={stats?.users} />
        <StatCard icon={Building2} label="Subcities" value={stats?.subcities} />
        <StatCard icon={MapPin} label="Woredas" value={stats?.woredas} />
        <StatCard icon={Tag} label="Categories" value={stats?.categories} />
        <StatCard icon={Download} label="Downloads" value={stats?.downloads} />
        <StatCard icon={Upload} label="Uploaded Today" value={stats?.todayUploads} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Documents by Subcity</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.bySubcity ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="oklch(0.55 0.16 150)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Monthly Upload Trend</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="oklch(0.55 0.16 150)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Documents by Category</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.byCategory ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" fontSize={10} width={170} />
                <Tooltip />
                <Bar dataKey="count" fill="oklch(0.6 0.12 180)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recently Uploaded Documents</CardTitle>
            <CardDescription>Latest additions to the repository</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recent ?? []).length === 0 && <div className="text-sm text-muted-foreground">No documents yet.</div>}
            {recent?.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.title}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(d.created_at), "PPp")}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>System-wide actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(activity ?? []).length === 0 && <div className="text-sm text-muted-foreground">No activity yet.</div>}
            {activity?.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm capitalize">{a.action.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PPp")}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
