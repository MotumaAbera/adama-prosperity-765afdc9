import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Upload, FileText, Tag, Building2, MapPin, Users,
  ClipboardList, LogOut, ChevronRight,
} from "lucide-react";
import logoAsset from "@/assets/logo.png.asset.json";
import { useAuth } from "@/lib/auth-context";
import { isAdminRole, ROLE_LABELS } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Upload Document", url: "/upload", icon: Upload },
  { title: "Documents", url: "/documents", icon: FileText },
  
];

const adminItems = [
  { title: "Categories", url: "/categories", icon: Tag },
  { title: "Subcities", url: "/subcities", icon: Building2 },
  { title: "Woredas", url: "/woredas", icon: MapPin },
  { title: "Users", url: "/users", icon: Users },
  { title: "Audit Logs", url: "/audit", icon: ClipboardList },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminRole(primaryRole);

  const handleSignOut = async () => {
    if (isMobile) setOpenMobile(false);
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const renderItem = (item: { title: string; url: string; icon: any }) => {
    const active = pathname === item.url;
    return (
      <SidebarMenuItem key={item.title + item.url}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={collapsed ? item.title : undefined}
          className={cn(
            "group/item relative h-11 rounded-xl text-white/75 transition-all duration-200",
            "hover:bg-white/10 hover:text-white hover:translate-x-0.5",
            "data-[active=true]:bg-white data-[active=true]:text-[#1e4ba0] data-[active=true]:font-semibold",
            "data-[active=true]:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]",
          )}
        >
          <Link to={item.url} onClick={() => { if (isMobile) setOpenMobile(false); }}>
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-all shrink-0",
                active
                  ? "bg-[image:var(--gradient-brand)] text-white shadow-[0_4px_10px_-2px_rgba(30,75,160,0.5)]"
                  : "bg-white/5 text-white/70 group-hover/item:bg-white/15 group-hover/item:text-white",
              )}
            >
              <item.icon className="h-4 w-4" />
            </span>
            <span className="text-sm">{item.title}</span>
            {active && !collapsed && (
              <ChevronRight className="ml-auto h-4 w-4 text-[#1e4ba0]/60" />
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r-0",
        "[&>[data-sidebar=sidebar]]:bg-[image:var(--gradient-sidebar)]",
        "[&>[data-sidebar=sidebar]]:shadow-[var(--shadow-sidebar)]",
        "[&>[data-sidebar=sidebar]]:relative [&>[data-sidebar=sidebar]]:overflow-hidden",
      )}
    >
      {/* Ambient glow overlays */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-[#7eb3ff]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/25 to-transparent" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <SidebarHeader className="border-b border-white/15 pb-4">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="relative h-11 w-11 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-white/30 blur-md" />
              <div className="relative h-11 w-11 rounded-2xl bg-white flex items-center justify-center overflow-hidden ring-1 ring-white/40 shadow-lg">
                <img src={logoAsset.url} alt="Adama DMS logo" className="h-10 w-10 object-contain" />
              </div>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-white truncate tracking-tight">Adama DMS</div>
                <div className="text-[10px] text-white/65 truncate uppercase tracking-[0.14em] font-medium">Prosperity Party</div>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4 scrollbar-thin">
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 px-2 mb-1">
                Workspace
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">{navItems.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isAdmin && (
            <SidebarGroup className="mt-5">
              {!collapsed && (
                <div className="flex items-center gap-2 px-2 mb-1">
                  <div className="h-px flex-1 bg-white/15" />
                  <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 p-0 h-auto">
                    Administration
                  </SidebarGroupLabel>
                  <div className="h-px flex-1 bg-white/15" />
                </div>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">{adminItems.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-white/15 p-3 gap-2">
          {profile && (
            <div className={cn(
              "flex items-center gap-3 rounded-xl transition-all",
              !collapsed && "bg-white/10 backdrop-blur-sm p-2.5 ring-1 ring-white/15",
              collapsed && "justify-center p-1",
            )}>
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-white/40 blur-md" />
                <div className="relative h-9 w-9 rounded-full bg-[image:var(--gradient-brand)] flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/30">
                  {initials}
                </div>
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{profile.full_name || profile.email}</div>
                  <div className="text-[10px] text-white/70 truncate font-medium">{primaryRole ? ROLE_LABELS[primaryRole] : "No role"}</div>
                </div>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 gap-2 text-white/85 hover:bg-white/15 hover:text-white rounded-lg font-medium",
              collapsed ? "justify-center px-0" : "justify-start",
            )}
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </Button>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
