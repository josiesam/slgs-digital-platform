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
        title: "Roles & Permissions",
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

export function DashboardSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

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
          <a className="flex items-center gap-2" href="#">
            <Logo className="h-8 w-8" />
            {!isCollapsed && (
              <span className="font-semibold text-black dark:text-white">
                SLGS CMS
              </span>
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
          className="top-12 -right-3 absolute flex justify-center items-center shadow-sm border border-border rounded-full w-6 h-6 transition-colors"
        >
          {isCollapsed ? (
            <IconChevronRight className="w-3 h-3" />
          ) : (
            <IconChevronLeft className="w-3 h-3" />
          )}
        </Button>
      </div>

      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={dashboardRoutes} />
      </SidebarContent>
      <SidebarFooter className="px-2">
        <TeamSwitcher teams={teams} />
      </SidebarFooter>
    </Sidebar>
  );
}
