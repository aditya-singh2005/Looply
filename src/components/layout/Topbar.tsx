import { useEffect, useState } from "react";
import { Bell, Search, LogOut } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getCurrentDate, getCurrentQuarterWindow } from "@/lib/utils/dates";

interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export function Topbar({
  title,
  searchQuery,
  onSearchChange,
}: {
  title: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}) {
  const { user, role, mounted, signOut } = useRole();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!mounted || !user) return;

    const supabase = createClient();

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
      }
    };

    fetchNotifications();

    // Lazy check-in window checker
    const checkCycleWindow = async () => {
      try {
        const { data: cycle } = await supabase
          .from("goal_cycles")
          .select("*")
          .eq("is_active", true)
          .maybeSingle();

        if (cycle) {
          const windowInfo = getCurrentQuarterWindow(cycle);
          if (windowInfo.isOpen) {
            const title = `${windowInfo.quarter} Check-in Window Open`;
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", user.id)
              .eq("title", title)
              .limit(1);

            if (!existing || existing.length === 0) {
              const { data: inserted, error: insertError } = await supabase
                .from("notifications")
                .insert({
                  user_id: user.id,
                  title,
                  body: `The ${windowInfo.quarter} check-in window for ${cycle.name} is now open for achievement updates. It closes in ${windowInfo.closesIn} days.`,
                  is_read: false
                })
                .select()
                .single();

              if (!insertError && inserted) {
                setNotifications((prev) => [inserted, ...prev]);
                toast.info(inserted.title, {
                  description: inserted.body || "",
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Error checking cycle window:", err);
      }
    };

    checkCycleWindow();

    // Setup realtime subscription
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          toast.info(newNotif.title, {
            description: newNotif.body || "",
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as NotificationItem;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mounted, user]);

  const handleMarkAsRead = async (id: string) => {
    const supabase = createClient();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    const supabase = createClient();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

      <div className="flex items-center gap-2 md:gap-4">
        <RoleSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative rounded-full p-2 text-text-secondary transition-colors hover:bg-surface-container"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 shadow-xl border border-border bg-white rounded-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-surface-container-low px-4 py-3">
              <span className="text-sm font-bold text-text-primary">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAllRead();
                  }}
                  className="text-xs font-semibold text-primary hover:underline hover:text-primary-hover"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Bell className="h-8 w-8 text-text-muted mb-2 animate-bounce" strokeWidth={1} />
                  <p className="text-xs font-semibold text-text-secondary">All caught up!</p>
                  <p className="text-[10px] text-text-muted mt-0.5">No new notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id)}
                    className={`flex flex-col gap-1 px-4 py-3 text-left transition-colors cursor-pointer ${
                      n.is_read ? "bg-white hover:bg-surface-container-low" : "bg-primary-subtle/30 hover:bg-primary-subtle/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${n.is_read ? "text-text-primary" : "text-primary"}`}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                        {n.body}
                      </p>
                    )}
                    <span className="text-[9px] text-text-muted mt-1 font-mono">
                      {new Date(n.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
            <Avatar className="h-8 w-8">
              {mounted && user?.profile_pic && <AvatarImage src={user.profile_pic} alt={user.name} />}
              <AvatarFallback className="bg-primary-subtle text-sm font-bold text-primary">
                {mounted && user ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "—"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-semibold text-text-primary lg:inline">
              {mounted && user ? user.name : ""}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">{mounted && user ? user.name : ""}</p>
              <p className="text-xs leading-none text-muted-foreground">{mounted && user ? user.email : ""}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
