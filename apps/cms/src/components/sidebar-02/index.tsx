import { Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger, Separator } from "@slgs/ui";
import { DashboardSidebar } from "./app-sidebar";

export default function Sidebar02() {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="flex flex-col min-h-svh">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SLGS Digital Platform CMS
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
