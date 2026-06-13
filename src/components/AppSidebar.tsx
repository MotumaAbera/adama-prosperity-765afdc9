import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Upload, FileText, Search, Tag, Building2, MapPin, Users,
  ClipboardList, LogOut,
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
  { title: "Advanced Search", url: "/documents", icon: Search },
];

const adminItems = [
  { title: "Categories", url: "/categories", icon: Tag },
  { title: "Subcities", url: "/subcities", icon: Building2 },
  { title: "Woredas", url: "/woredas", icon: MapPin },
  { title: "Users", url: "/users", icon: Users },
  { title: "Audit Logs", url: "/audit", icon: ClipboardList },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminRole(primaryRole);

  const handleSignOut = async () => {
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
            "group/item relative h-10 rounded-lg text-sidebar-foreground/80 transition-all",
            "hover:bg-white/5 hover:text-sidebar-foreground",
            "data-[active=true]:bg-white/10 data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium",
            "data-[active=true]:shadow-[inset_3px_0_0_var(--brand)]",
          )}
        >
          <Link to={item.url}>
            <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-brand" : "text-sidebar-foreground/60 group-hover/item:text-sidebar-foreground")} />
            <span className="text-sm">{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border [&>[data-sidebar=sidebar]]:bg-[image:var(--gradient-sidebar)]"
    >
      <SidebarHeader className="border-b border-white/10">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="h-10 w-10 rounded-xl bg-white shadow-[var(--shadow-brand)] flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/30">
            <img src={logoAsset.url} alt="Adama DMS logo" className="h-9 w-9 object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-sidebar-foreground truncate">Adama DMS</div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate uppercase tracking-wider">Prosperity Party</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{navItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-2">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
                Administration
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">{adminItems.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-2">
        {profile && (
          <div className={cn(
            "flex items-center gap-3 rounded-lg p-2",
            !collapsed && "bg-white/5",
          )}>
            <div className="h-9 w-9 rounded-full bg-[image:var(--gradient-brand)] flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-[var(--shadow-brand)]">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-sidebar-foreground truncate">{profile.full_name || profile.email}</div>
                <div className="text-[10px] text-sidebar-foreground/60 truncate">{primaryRole ? ROLE_LABELS[primaryRole] : "No role"}</div>
              </div>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 mt-1 text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
