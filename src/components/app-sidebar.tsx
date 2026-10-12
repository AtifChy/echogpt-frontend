"use client";

import {
  AiChat02Icon,
  BookOpen01Icon,
  Globe02Icon,
  DashboardSquare01Icon,
  PlusSignIcon,
  Search01Icon,
  Delete02Icon,
  Settings01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";

import { ErrorNotice } from "@/components/feedback";
import { Icon } from "@/components/icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Conversation, Usage, User } from "@/lib/types";
import { useWorkspace, type WorkspaceView } from "@/lib/workspace-store";

export function AppSidebar({
  user,
  usage,
  conversations,
  loading,
  error,
  onRetry,
  onNewChat,
  onNavigate,
  onConversation,
  onDelete,
  onAccount,
  onSignIn,
  onLogout,
  busy,
  loggingOut,
}: {
  user: User | null;
  usage?: Usage;
  conversations?: Conversation[];
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
  onNewChat: () => void;
  onNavigate: (view: WorkspaceView) => void;
  onConversation: (id: number) => void;
  onDelete: (id: number) => void;
  onAccount: (tab: "profile" | "usage") => void;
  onSignIn: () => void;
  onLogout: () => void;
  busy: boolean;
  loggingOut: boolean;
}) {
  const { view, conversationId, titles } = useWorkspace();
  const { setOpenMobile, state, isMobile } = useSidebar();
  const iconOnly = state === "collapsed" && !isMobile;
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const closeAnd = (action: () => void) => {
    action();
    setOpenMobile(false);
  };
  const name = user?.displayName || user?.email.split("@")[0] || "Your workspace";
  const visible = (conversations || []).filter((item) =>
    (titles[item.id] || `Conversation ${item.id}`).toLowerCase().includes(filter.toLowerCase()),
  );
  const navigation = [
    { view: "chat" as const, label: "Conversations", icon: AiChat02Icon },
    { view: "search" as const, label: "Web search", icon: Globe02Icon },
    { view: "library" as const, label: "Prompt library", icon: BookOpen01Icon },
    ...(user?.role.name === "ADMIN"
      ? [{ view: "admin" as const, label: "Administration", icon: DashboardSquare01Icon }]
      : []),
  ];
  return (
    <Sidebar collapsible="icon" aria-label="Workspace navigation">
      <SidebarHeader className="gap-4 p-2 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarMenuButton
            tooltip="EchoGPT home"
            aria-label="EchoGPT home"
            onClick={() => closeAnd(onNewChat)}
            disabled={busy}
          >
            <Icon icon={AiChat02Icon} />
            <span className="text-xl tracking-tight group-data-[collapsible=icon]:hidden">
              EchoGPT<span>.</span>
            </span>
          </SidebarMenuButton>
          {isMobile && <SidebarTrigger aria-label="Close navigation" />}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              variant="outline"
              tooltip="New conversation"
              onClick={() => closeAnd(onNewChat)}
              disabled={busy}
              aria-label="New conversation"
            >
              <Icon icon={PlusSignIcon} />
              <span>New conversation</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Main navigation">
              <SidebarMenu>
                {navigation.map((item) => (
                  <SidebarMenuItem key={item.view}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={view === item.view}
                      disabled={busy}
                      aria-label={item.label}
                      onClick={() => closeAnd(() => onNavigate(item.view))}
                    >
                      <Icon icon={item.icon} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-3 group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Your conversations</SidebarGroupLabel>
          <SidebarGroupAction
            aria-label="Filter conversations"
            onClick={() => {
              setFilterOpen(!filterOpen);
              setFilter("");
            }}
          >
            <Icon icon={Search01Icon} />
          </SidebarGroupAction>
          <SidebarGroupContent>
            {filterOpen && (
              <SidebarInput
                aria-label="Filter conversation history"
                placeholder="Find a conversation…"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="mb-3 group-data-[collapsible=icon]:hidden"
              />
            )}
            {user && loading ? (
              <SidebarMenu>
                {[0, 1, 2].map((item) => (
                  <SidebarMenuSkeleton key={item} showIcon />
                ))}
              </SidebarMenu>
            ) : user && error ? (
              <div className="group-data-[collapsible=icon]:hidden">
                <ErrorNotice error={error} title="Couldn’t load conversations" onRetry={onRetry} />
              </div>
            ) : visible.length ? (
              <SidebarMenu>
                {visible.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={titles[item.id] || `Conversation ${item.id}`}
                      isActive={conversationId === item.id && view === "chat"}
                      disabled={busy}
                      onClick={() => closeAnd(() => onConversation(item.id))}
                    >
                      <Icon icon={AiChat02Icon} />
                      <span>{titles[item.id] || `Conversation ${item.id}`}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      aria-label={`Delete conversation ${item.id}`}
                      disabled={busy}
                      onClick={() => onDelete(item.id)}
                    >
                      <Icon icon={Delete02Icon} />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <Empty className="sidebar-empty items-start justify-start gap-2 px-3 py-4 text-left">
                <EmptyHeader className="items-start">
                  <EmptyTitle>{filter ? "No matches" : "No conversations yet"}</EmptyTitle>
                  <EmptyDescription>
                    {filter
                      ? "Try another conversation title."
                      : user
                        ? "Start a conversation to see it here."
                        : "Sign in to save and revisit your conversations."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 p-2 pb-4">
        {user && usage && (
          <Button
            variant="ghost"
            className="h-auto justify-between gap-2 px-3 py-2 group-data-[collapsible=icon]:hidden"
            onClick={() => closeAnd(() => onAccount("usage"))}
          >
            <span className="flex flex-col items-start gap-1">
              <span className="text-sm">
                {usage.plan === "PREMIUM" ? "Premium plan" : "Free plan"}
              </span>
              <span className="type-caption text-muted-foreground font-normal">
                {usage.remaining.toLocaleString()} requests remaining
              </span>
            </span>
            <span className="type-caption tabular-nums">
              {usage.used}/{usage.limit}
            </span>
          </Button>
        )}
        {!user && (
          <p className="type-caption text-muted-foreground px-3 leading-relaxed group-data-[collapsible=icon]:hidden">
            Your ideas, saved in one place.
          </p>
        )}
        <SidebarSeparator className="mx-0" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size={iconOnly ? "default" : "lg"}
              tooltip={user ? "Account settings" : "Sign in"}
              aria-label={user ? "Account settings" : "Sign in to your workspace"}
              disabled={busy}
              onClick={() => closeAnd(() => (user ? onAccount("profile") : onSignIn()))}
            >
              {iconOnly ? (
                <Icon icon={Settings01Icon} />
              ) : (
                <Avatar className="shrink-0">
                  <AvatarFallback>
                    {user ? name.slice(0, 1).toUpperCase() : <Icon icon={Settings01Icon} />}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="flex min-w-0 flex-col gap-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{name}</span>
                <span className="type-caption text-muted-foreground">
                  {user ? "Personal workspace" : "Sign in to get started"}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Sign out"
                disabled={busy || loggingOut}
                onClick={() => closeAnd(onLogout)}
                aria-label="Sign out"
              >
                <Icon icon={Logout01Icon} />
                <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
