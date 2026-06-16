import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, Upload, Megaphone, MoreHorizontal,
  Tag, Building2, MapPin, Users, ClipboardList, User, LogOut, X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { isAdminRole, ROLE_LABELS } from "@/lib/db";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const primary = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Docs", url: "/documents", icon: FileText },
  { title: "Upload", url: "/upload", icon: Upload, fab: true },
  { title: "Posts", url: "/announcements", icon: Megaphone },
];

const moreItems = [
  { title: "Profile", url: "/profile", icon: User, adminOnly: false },
  { title: "Categories", url: "/categories", icon: Tag, adminOnly: true },
  { title: "Subcities", url: "/subcities", icon: Building2, adminOnly: true },
  { title: "Woredas", url: "/woredas", icon: MapPin, adminOnly: true },
  { title: "Users", url: "/users", icon: Users, adminOnly: true },
  { title: "Audit Logs", url: "/audit", icon: ClipboardList, adminOnly: true },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const { profile, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminRole(primaryRole);

  const visibleMore = moreItems.filter((i) => !i.adminOnly || isAdmin);
  const moreActive = visibleMore.some((i) => pathname === i.url);

  const handleSignOut = async () => {
    setMoreOpen(false);
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.12)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="relative grid grid-cols-5 h-16">
          {primary.map((item) => {
            const active = pathname === item.url;
            if (item.fab) {
              return (
                <li key={item.url} className="flex items-start justify-center">
                  <Link
                    to={item.url}
                    aria-label={item.title}
                    className={cn(
                      "relative -mt-5 h-14 w-14 rounded-2xl flex items-center justify-center",
                      "bg-[image:var(--gradient-brand)] text-white shadow-[0_10px_24px_-8px_rgba(30,75,160,0.6)]",
                      "ring-4 ring-card transition-transform active:scale-95",
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  className={cn(
                    "h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                    active ? "text-[#1e4ba0]" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                    active && "bg-[#1e4ba0]/10",
                  )}>
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "w-full h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                moreActive ? "text-[#1e4ba0]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                moreActive && "bg-[#1e4ba0]/10",
              )}>
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </span>
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0 max-h-[85vh] [&>button]:hidden"
        >
          <SheetHeader className="px-5 pt-4 pb-3 border-b text-left">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">Menu</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>

          {profile && (
            <div className="px-5 py-4 flex items-center gap-3 border-b bg-muted/30">
              <div className="h-11 w-11 rounded-full bg-[image:var(--gradient-brand)] flex items-center justify-center text-white text-sm font-bold ring-2 ring-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{profile.full_name || profile.email}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {primaryRole ? ROLE_LABELS[primaryRole] : "No role"}
                </div>
              </div>
            </div>
          )}

          <div className="px-3 py-3 overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
            <div className="grid grid-cols-3 gap-2">
              {visibleMore.map((item) => {
                const active = pathname === item.url;
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-xl p-3 transition-all",
                      "border border-border bg-card hover:bg-muted/60 active:scale-95",
                      active && "border-[#1e4ba0]/30 bg-[#1e4ba0]/5",
                    )}
                  >
                    <span className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      active ? "bg-[image:var(--gradient-brand)] text-white" : "bg-muted text-foreground/70",
                    )}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-medium text-center leading-tight">{item.title}</span>
                  </Link>
                );
              })}
            </div>

            <Button
              variant="outline"
              className="mt-4 w-full h-11 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
