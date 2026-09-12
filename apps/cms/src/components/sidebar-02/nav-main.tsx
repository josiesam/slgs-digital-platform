import { ChevronDown, ChevronUp } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@slgs/ui";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuItem as SidebarMenuSubItem,
  useSidebar,
} from "@slgs/ui";
import { cn } from "@slgs/ui";
import { Link } from "@tanstack/react-router";

export type Route = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  link: string;
  subs?: {
    title: string;
    link: string;
    icon?: React.ReactNode;
  }[];
};

export default function DashboardNavigation({ routes }: { routes: Route[] }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);

  return (
    <SidebarMenu>
      {routes.map((route) => {
        const isOpen = !isCollapsed && openCollapsible === route.id;
        const hasSubRoutes = !!route.subs?.length;

        return (
          <SidebarMenuItem key={route.id}>
            {hasSubRoutes ? (
              <Collapsible
                className="w-full"
                onOpenChange={(open) =>
                  setOpenCollapsible(open ? route.id : null)
                }
                open={isOpen}
              >
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className={cn(
                      "flex w-full items-center rounded-lg px-2 transition-colors",
                      isOpen
                        ? "bg-sidebar-muted text-foreground"
                        : "text-muted-foreground hover:bg-sidebar-muted hover:text-foreground",
                      isCollapsed && "justify-center",
                    )}
                  >
                    {route.icon}
                    {!isCollapsed && (
                      <span className="ml-2 flex-1 font-medium text-sm">
                        {route.title}
                      </span>
                    )}
                    {!isCollapsed && hasSubRoutes && (
                      <span className="ml-auto">
                        {isOpen ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </span>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                {!isCollapsed && (
                  <CollapsibleContent>
                    <SidebarMenuSub className="my-1 ml-3.5 ">
                      {route.subs?.map((subRoute) => (
                        <SidebarMenuSubItem
                          className="h-auto"
                          key={`${route.id}-${subRoute.title}`}
                        >
                          <SidebarMenuSubButton asChild>
                            <div className="flex">
                              {subRoute.icon && subRoute.icon}

                              <Link
                                className="flex items-center rounded-md px-4 py-1.5 font-medium text-muted-foreground text-sm hover:bg-sidebar-muted hover:text-foreground"
                                to={subRoute.link}
                              >
                                {subRoute.title}
                              </Link>
                            </div>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </Collapsible>
            ) : (
              <SidebarMenuButton tooltip={route.title} asChild>
                <Link
                  className={cn(
                    "flex items-center rounded-lg px-2 text-muted-foreground transition-colors hover:bg-sidebar-muted hover:text-foreground",
                    isCollapsed && "justify-center",
                  )}
                  to={route.link}
                >
                  {route.icon}
                  {!isCollapsed && (
                    <span className="ml-2 font-medium text-sm">
                      {route.title}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
