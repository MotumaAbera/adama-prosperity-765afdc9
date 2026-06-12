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

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: "all" },
  { title: "Upload Document", url: "/upload", icon: Upload, roles: "all" },
  { title: "Documents", url: "/documents", icon: FileText, roles: "all" },
  { title: "Advanced Search", url: "/documents", icon: Search, roles: "all", hash: "search" },
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">Adama DMS</div>
              <div className="text-[10px] text-muted-foreground truncate">Prosperity Party</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && profile && (
          <div className="px-2 py-2">
            <div className="text-xs font-medium truncate">{profile.full_name || profile.email}</div>
            <div className="text-[10px] text-muted-foreground">{primaryRole ? ROLE_LABELS[primaryRole] : "No role"}</div>
          </div>
        )}
        <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
