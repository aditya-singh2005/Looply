"use client";

import { Bell, Search } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";
import { useRole } from "@/lib/hooks/useRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export function Topbar({
  title,
  searchQuery,
  onSearchChange,
}: {
  title: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}) {
  const { user, mounted } = useRole();

  return (
    <header className="fixed right-0 top-0 z-40 flex h-topbar w-full items-center justify-between border-b border-border bg-white px-4 md:left-16 md:px-6 lg:left-[240px]">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <h2 className="truncate text-section-header font-semibold text-text-primary lg:hidden">
          {title}
        </h2>
        <div className="relative hidden max-w-md flex-1 xl:block">
          <Search
            className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted"
            strokeWidth={1.5}
          />
          <Input
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search goals, reports, or teammates..."
            className="h-9 border-border bg-surface-container-low pl-10 text-body focus-visible:ring-primary/20"
          />
        </div>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        <RoleSwitcher />
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="md:hidden">
          <RoleSwitcher />
        </div>
        <button
          type="button"
          className="relative rounded-full p-2 text-text-secondary transition-colors hover:bg-surface-container"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-danger" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary-subtle text-sm font-bold text-primary">
                {mounted ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2) : "—"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-semibold text-text-primary lg:inline">
              {mounted ? user.name : ""}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>{mounted ? user.email : ""}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
