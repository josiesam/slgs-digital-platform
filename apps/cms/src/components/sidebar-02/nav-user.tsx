import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { createAuthClient } from "better-auth/react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@slgs/ui";

const authClient = createAuthClient();

export function NavUser({
  user,
}: {
  readonly user?: {
    readonly displayName: string;
    readonly role: string;
    readonly avatar?: string;
  };
}) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

  const displayName = user?.displayName ?? "CMS User";
  const role = user?.role ?? "Administration";

  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CU";

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore invalid session errors on sign-out
    }
    await navigate({ to: "/login" });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user?.avatar && (
                  <AvatarImage alt={displayName} src={user.avatar} />
                )}
                <AvatarFallback className="rounded-lg bg-[#42245f] font-serif font-bold text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-muted-foreground text-xs">
                  {role}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="mb-2 min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user?.avatar && (
                    <AvatarImage alt={displayName} src={user.avatar} />
                  )}
                  <AvatarFallback className="rounded-lg bg-[#42245f] font-serif font-bold text-white text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {role}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link
                  className="flex items-center gap-2 cursor-pointer"
                  to="/dashboard/profile"
                >
                  <Settings className="size-4" />
                  Account Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
