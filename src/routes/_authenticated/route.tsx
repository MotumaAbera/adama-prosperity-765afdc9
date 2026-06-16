import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function HamburgerTrigger({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={toggleSidebar}
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!session) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-1 bg-[#3e7edd] shrink-0" />
          <header className="h-14 flex items-center gap-2 border-b bg-card px-4 sticky top-0 z-10">
            <HamburgerTrigger className="hidden md:inline-flex" />
            <div className="md:hidden flex items-center gap-2 bg-[#3e7edd] -my-2 -mx-4 px-4 py-2 rounded-lg">
              <img src={logoAsset.url} alt="Adama City PP DMS logo" className="h-8 w-8 object-contain rounded-lg" />
              <span className="font-semibold text-sm tracking-tight text-white">Adama City PP DMS</span>
            </div>
            <div className="flex-1" />
            <div className="text-xs text-muted-foreground hidden md:block">
              Adama City Prosperity Party · Document Management System
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto pb-24 md:pb-6">
            <Outlet />
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
