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

function StatCard({ icon: Icon, label, value, hint }: any) {
  return (
    <Card className="relative overflow-hidden border-border/60 hover:shadow-[var(--shadow-card)] transition-shadow">
      <div className="absolute inset-0 bg-gradient-to-br from-[#3e7edd]/10 to-transparent pointer-events-none" />
      <CardContent className="relative p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-[#3e7edd]/10 flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6 text-[#3e7edd]" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold tracking-tight text-foreground">{value ?? "—"}</div>
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
      <div className="rounded-2xl p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3e7edd]">
          {primaryRole ? ROLE_LABELS[primaryRole] : "No role"} · Adama City
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1 text-foreground">
          Welcome back, {profile?.full_name?.split(" ")[0] || profile?.email?.split("@")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prosperity Party · Document Management System
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={FileText} label="Total Documents" value={stats?.documents} accentIndex={0} />
        <StatCard icon={Users} label="Total Users" value={stats?.users} accentIndex={1} />
        <StatCard icon={Building2} label="Subcities" value={stats?.subcities} accentIndex={2} />
        <StatCard icon={MapPin} label="Woredas" value={stats?.woredas} accentIndex={3} />
        <StatCard icon={Tag} label="Categories" value={stats?.categories} accentIndex={4} />
        <StatCard icon={Download} label="Downloads" value={stats?.downloads} accentIndex={5} />
        <StatCard icon={Upload} label="Uploaded Today" value={stats?.todayUploads} accentIndex={6} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Documents by Subcity</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.bySubcity ?? []}>
                <defs>
                  <linearGradient id="barBrand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={1} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" fontSize={11} stroke="currentColor" opacity={0.6} />
                <YAxis fontSize={11} allowDecimals={false} stroke="currentColor" opacity={0.6} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Bar dataKey="count" fill="url(#barBrand)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Monthly Upload Trend</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.trend ?? []}>
                <defs>
                  <linearGradient id="lineBrandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="month" fontSize={11} stroke="currentColor" opacity={0.6} />
                <YAxis fontSize={11} allowDecimals={false} stroke="currentColor" opacity={0.6} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Line type="monotone" dataKey="count" stroke={BRAND} strokeWidth={2.5} dot={{ r: 4, fill: BRAND }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader><CardTitle className="text-base">Documents by Category</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.byCategory ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis type="number" fontSize={11} allowDecimals={false} stroke="currentColor" opacity={0.6} />
                <YAxis type="category" dataKey="name" fontSize={10} width={170} stroke="currentColor" opacity={0.7} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Bar dataKey="count" fill={BRAND} radius={[0, 6, 6, 0]} />
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
