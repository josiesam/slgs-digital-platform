import { Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger, Separator } from "@slgs/ui";
import { DashboardSidebar } from "./app-sidebar";

export default function Sidebar02({
  permissions,
  identity,
}: {
  readonly permissions?: readonly string[];
  readonly identity?: { readonly displayName: string; readonly role: string };
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar permissions={permissions} identity={identity} />
      <SidebarInset className="flex flex-col min-h-svh">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SLGS Digital Platform CMS
            </span>
          </div>
          {identity && (
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                {identity.role}
              </span>
              <span className="font-medium text-foreground">
                {identity.displayName}
              </span>
            </div>
          )}
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
