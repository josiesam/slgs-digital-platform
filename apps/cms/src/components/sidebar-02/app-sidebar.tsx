import { motion } from "framer-motion";

import {
  IconActivity,
  IconArticle,
  IconBell,
  IconCalendarEvent,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconFile,
  IconFolder,
  IconMenu2,
  IconPhoto,
  IconSettings,
  IconShield,
  IconUsers,
  IconWorld,
  IconHome,
} from "@tabler/icons-react";
import {
  Button,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@slgs/ui";
import { cn } from "@slgs/ui";
import { Logo } from "./logo";
import type { Route } from "./nav-main";
import DashboardNavigation from "./nav-main";
import { NotificationsPopover } from "./nav-notifications";
import { TeamSwitcher } from "./team-switcher";

const sampleNotifications = [
  {
    id: "1",
    avatar: "/avatars/01.png",
    fallback: "OM",
    text: "New order received.",
    time: "10m ago",
  },
  {
    id: "2",
    avatar: "/avatars/02.png",
    fallback: "JL",
    text: "Server upgrade completed.",
    time: "1h ago",
  },
  {
    id: "3",
    avatar: "/avatars/03.png",
    fallback: "HH",
    text: "New user signed up.",
    time: "2h ago",
  },
];

const dashboardRoutes: Route[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <IconHome className="size-4" />,
    link: "/dashboard",
  },
  {
    id: "content",
    title: "Content",
    icon: <IconFile className="size-4" />,
    link: "/dashboard/content",
    subs: [
      {
        title: "Pages",
        link: "/dashboard/content/pages",
        icon: <IconFile className="size-4" />,
      },
      {
        title: "News",
        link: "/dashboard/content/news",
        icon: <IconArticle className="size-4" />,
      },
      {
        title: "Events",
        link: "/dashboard/content/events",
        icon: <IconCalendarEvent className="size-4" />,
      },
      {
        title: "Announcements",
        link: "/dashboard/content/announcement",
        icon: <IconBell className="size-4" />,
      },
      {
        title: "Gallery",
        link: "/dashboard/content/gallery",
        icon: <IconPhoto className="size-4" />,
      },
      {
        title: "Media Library",
        link: "/dashboard/content/media",
        icon: <IconPhoto className="size-4" />,
      },
    ],
  },
  {
    id: "editorial",
    title: "Editorial",
    icon: <IconFolder className="size-4" />,
    link: "/dashboard/editorial",
    subs: [
      {
        title: "Drafts",
        link: "/dashboard/editorial/drafts",
        icon: <IconFolder className="size-4" />,
      },
      {
        title: "Review Queue",
        link: "/dashboard/editorial/review",
        icon: <IconClock className="size-4" />,
      },
      {
        title: "Approval Queue",
        link: "/dashboard/editorial/approval",
        icon: <IconCheck className="size-4" />,
      },
      {
        title: "Published",
        link: "/dashboard/editorial/published",
        icon: <IconWorld className="size-4" />,
      },
    ],
  },
  {
    id: "public-web",
    title: "Public Web",
    icon: <IconMenu2 className="size-4" />,
    link: "/dashboard/public",
    subs: [
      {
        title: "Navigation",
        link: "/dashboard/public/navigation",
        icon: <IconMenu2 className="size-4" />,
      },
      {
        title: "Pages",
        link: "/dashboard/public/pages",
        icon: <IconFile className="size-4" />,
      },
      {
        title: "Preview",
        link: "/dashboard/public/preview",
        icon: <IconWorld className="size-4" />,
      },
      {
        title: "Published Site",
        link: "/dashboard/public/published",
        icon: <IconWorld className="size-4" />,
      },
    ],
  },
  {
    id: "access",
    title: "Access",
    icon: <IconUsers className="size-4" />,
    link: "/dashboard/access",
    subs: [
      {
        title: "Users",
        link: "/dashboard/access/users",
        icon: <IconUsers className="size-4" />,
      },
      {
        title: "Clubs",
        link: "/dashboard/access/clubs",
        icon: <IconFile className="size-4" />,
      },
      {
        title: "Roles",
        link: "/dashboard/access/roles",
        icon: <IconShield className="size-4" />,
      },
    ],
  },
  {
    id: "system",
    title: "System",
    icon: <IconActivity className="size-4" />,
    link: "/dashboard/system",
    subs: [
      {
        title: "Audit Log",
        link: "/dashboard/system/log",
        icon: <IconActivity className="size-4" />,
      },
      {
        title: "System Status",
        link: "/dashboard/system/status",
        icon: <IconSettings className="size-4" />,
      },
    ],
  },
];

const teams = [
  { id: "1", name: "Alpha Inc.", logo: Logo, plan: "Free" },
  { id: "2", name: "Beta Corp.", logo: Logo, plan: "Free" },
  { id: "3", name: "Gamma Tech", logo: Logo, plan: "Free" },
];

function getFilteredRoutes(permissions?: readonly string[]): Route[] {
  if (!permissions || permissions.length === 0) return dashboardRoutes;
  const p = new Set(permissions);
  const isAdmin =
    p.has("role:assign:cms") ||
    p.has("user:create:cms") ||
    p.has("configuration:manage:cms");

  return dashboardRoutes
    .map((group) => {
      if (!group.subs) return group;
      const filteredSubs = group.subs.filter((sub) => {
        if (isAdmin) return true;
        // Content subs
        if (sub.link.includes("/content/pages"))
          return (
            p.has("page:create:own") ||
            p.has("content:create:own") ||
            p.has("content:read:cms") ||
            p.has("content:read:club") ||
            p.has("content:read:assigned")
          );
        if (sub.link.includes("/content/news"))
          return (
            p.has("article:create:own") ||
            p.has("content:create:own") ||
            p.has("content:read:cms") ||
            p.has("content:read:club") ||
            p.has("content:read:assigned")
          );
        if (sub.link.includes("/content/events"))
          return (
            p.has("event:create:own") ||
            p.has("content:create:own") ||
            p.has("content:read:cms") ||
            p.has("content:read:club") ||
            p.has("content:read:assigned")
          );
        if (sub.link.includes("/content/announcement"))
          return (
            p.has("announcement:create:own") ||
            p.has("content:create:own") ||
            p.has("content:read:cms") ||
            p.has("content:read:club") ||
            p.has("content:read:assigned")
          );
        if (sub.link.includes("/content/gallery"))
          return (
            p.has("gallery:create:own") ||
            p.has("content:create:own") ||
            p.has("content:read:cms") ||
            p.has("content:read:club") ||
            p.has("content:read:assigned")
          );
        if (sub.link.includes("/content/media"))
          return (
            p.has("media:create:own") ||
            p.has("media:read:club") ||
            p.has("media:read:cms")
          );

        // Editorial subs
        if (sub.link.includes("/editorial/drafts"))
          return (
            p.has("content:create:own") ||
            p.has("article:create:own") ||
            p.has("content:submit:own") ||
            p.has("content:read:club")
          );
        if (sub.link.includes("/editorial/review"))
          return (
            p.has("content:review:assigned") || p.has("content:review:cms")
          );
        if (sub.link.includes("/editorial/approval"))
          return (
            p.has("content:approve:assigned") || p.has("content:approve:cms")
          );
        if (sub.link.includes("/editorial/published"))
          return (
            p.has("content:publish:approved") ||
            p.has("content:publish:cms") ||
            p.has("content:read:approved")
          );

        // Public subs
        if (sub.link.includes("/public"))
          return (
            p.has("content:publish:approved") ||
            p.has("content:publish:cms") ||
            p.has("configuration:manage:cms")
          );

        // Access subs
        if (sub.link.includes("/access/users"))
          return p.has("user:read:cms") || p.has("membership:read:cms");
        if (sub.link.includes("/access/clubs"))
          return p.has("club:read:cms") || p.has("club:manage:assigned");
        if (sub.link.includes("/access/roles"))
          return (
            p.has("role:assign:cms") ||
            p.has("role:create:cms") ||
            p.has("configuration:manage:cms")
          );

        // System subs
        if (sub.link.includes("/system/log")) return p.has("audit:read:cms");
        if (sub.link.includes("/system/status"))
          return p.has("configuration:manage:cms") || p.has("audit:read:cms");

        return true;
      });

      return { ...group, subs: filteredSubs };
    })
    .filter(
      (group) =>
        group.id === "dashboard" || (group.subs && group.subs.length > 0),
    );
}

export function DashboardSidebar({
  permissions,
  identity,
}: {
  readonly permissions?: readonly string[];
  readonly identity?: { readonly displayName: string; readonly role: string };
}) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const activeRoutes = getFilteredRoutes(permissions);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <div className="relative">
        <SidebarHeader
          className={cn(
            "flex md:pt-3.5",
            isCollapsed
              ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start"
              : "flex-row items-center justify-between",
          )}
        >
          <a className="flex items-center gap-2" href="/dashboard">
            <span className="flex justify-center items-center bg-[#42245f] shadow-sm border border-[#c2b28a] rounded-lg w-8 h-8 font-serif font-bold text-white text-xs">
              SL
            </span>
            {!isCollapsed && (
              <div className="flex flex-col text-left">
                <span className="font-serif font-bold text-foreground text-sm leading-none">
                  SLGS CMS
                </span>
                <span className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                  {identity?.role ?? "Administration"}
                </span>
              </div>
            )}
          </a>

          <motion.div
            animate={{ opacity: 1 }}
            className={cn(
              "flex items-center gap-2",
              isCollapsed ? "flex-row md:flex-col-reverse" : "flex-row",
            )}
            initial={{ opacity: 0 }}
            key={isCollapsed ? "header-collapsed" : "header-expanded"}
            transition={{ duration: 0.8 }}
          >
            <NotificationsPopover notifications={sampleNotifications} />
          </motion.div>
        </SidebarHeader>
        <Button
          onClick={toggleSidebar}
          className="top-12 -right-3 absolute flex justify-center items-center bg-background hover:bg-accent shadow-sm border border-border rounded-full w-6 h-6 transition-colors"
        >
          {isCollapsed ? (
            <IconChevronRight className="w-3 h-3" />
          ) : (
            <IconChevronLeft className="w-3 h-3" />
          )}
        </Button>
      </div>

      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={activeRoutes} />
      </SidebarContent>
      <SidebarFooter className="px-2">
        <TeamSwitcher teams={teams} />
      </SidebarFooter>
    </Sidebar>
  );
}
