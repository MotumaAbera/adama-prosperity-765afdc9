import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/audit")({
  ssr: false,
  component: AuditPage,
});

function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const [{ data: logs }, { data: profiles }, { data: docs }] = await Promise.all([
        db.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(500),
        db.from("profiles").select("id,full_name,email"),
        db.from("documents").select("id,title"),
      ]);
      return (logs ?? []).map((l: any) => ({
        ...l,
        user: profiles?.find((p: any) => p.id === l.user_id),
        document: docs?.find((d: any) => d.id === l.document_id),
      }));
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">All system activity (last 500 events)</p>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No activity yet.</TableCell></TableRow>}
              {data?.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), "PPp")}</TableCell>
                  <TableCell className="text-sm">{l.user?.full_name || l.user?.email || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{l.action.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-sm truncate max-w-xs">{l.document?.title || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.details ? JSON.stringify(l.details) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
