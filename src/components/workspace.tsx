"use client";

import { BookOpen01Icon, AiChat02Icon, Globe02Icon } from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AccountDialog } from "@/components/account-dialog";
import { AdminWorkspace } from "@/components/admin-workspace";
import { Modal } from "@/components/app-modal";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthDialog } from "@/components/auth-dialog";
import { Composer } from "@/components/composer";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorNotice, LoadingRows } from "@/components/feedback";
import { HomeWorkspace } from "@/components/home-workspace";
import { Icon } from "@/components/icon";
import { MessageList } from "@/components/messages";
import { PageHeading } from "@/components/page-heading";
import { PromptLibrary } from "@/components/prompt-library";
import { SearchWorkspace } from "@/components/search-workspace";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, ApiError } from "@/lib/api";
import type { Conversation, Message, Source, Usage, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace, type WorkspaceView } from "@/lib/workspace-store";

export function Workspace() {
  return (
    <SidebarProvider className="h-dvh min-h-0">
      <WorkspaceContent />
    </SidebarProvider>
  );
}

function WorkspaceContent() {
  const { state, isMobile, openMobile } = useSidebar();
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountTab, setAccountTab] = useState<"profile" | "usage" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sources, setSources] = useState<Record<number, Source[]>>({});

  const session = useQuery({
    queryKey: ["session"],
    queryFn: async ({ signal }) => {
      try {
        return await api<User>("users/me", { signal }, false);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
  });
  const user = session.data ?? null;
  const conversations = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: ({ signal }) => api<Conversation[]>("conversations", { signal }),
    enabled: !!user,
  });
  const usage = useQuery({
    queryKey: ["usage", user?.id],
    queryFn: ({ signal }) => api<Usage>("usage/me", { signal }),
    enabled: !!user,
  });
  const messages = useQuery({
    queryKey: ["messages", user?.id, workspace.conversationId],
    queryFn: ({ signal }) =>
      api<Message[]>(`conversations/${workspace.conversationId}/messages`, { signal }),
    enabled: !!user && !!workspace.conversationId,
  });

  function endSession() {
    queryClient.cancelQueries();
    queryClient.clear();
    queryClient.setQueryData(["session"], null);
    workspace.reset();
    setSources({});
    setAccountTab(null);
  }

  useEffect(() => {
    const expired = () => {
      queryClient.cancelQueries();
      queryClient.clear();
      queryClient.setQueryData(["session"], null);
      useWorkspace.getState().reset();
      setSources({});
      setAccountTab(null);
      toast.add({
        title: "Your session has ended.",
        description: "Sign in to continue.",
        type: "info",
      });
    };
    window.addEventListener("echogpt:session-expired", expired);
    return () => window.removeEventListener("echogpt:session-expired", expired);
  }, [queryClient]);

  const send = useMutation({
    mutationFn: async (input: {
      prompt: string;
      webSearch: boolean;
      conversationId: number | null;
    }) => {
      let id = input.conversationId;
      if (!id) {
        const title = input.prompt.trim().replace(/\s+/g, " ").slice(0, 60);

        const created = await api<Conversation>("conversations", {
          method: "POST",
          body: JSON.stringify({ title }),
        });

        id = created.id;
        queryClient.setQueryData(["messages", user?.id, id], []);
        workspace.openConversation(id);

        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
      const response = await api<{ message: Message }>("chat/messages", {
        method: "POST",
        body: JSON.stringify({
          conversationId: id,
          prompt: input.prompt,
          webSearch: input.webSearch,
        }),
      });
      return { ...response, conversationId: id };
    },
    onMutate: () => setDraft(""),
    onSuccess: (response, input) => {
      setSources((previous) => ({
        ...previous,
        [response.message.id]: response.message.sources ?? [],
      }));
      queryClient.setQueryData<Message[]>(
        ["messages", user?.id, response.conversationId],
        (previous = []) => {
          const last = previous.at(-1);
          const optimistic: Message = {
            id: -Date.now(),
            role: "USER",
            content: input.prompt,
            inputTokens: 0,
            outputTokens: 0,
            createdAt: new Date().toISOString(),
          };
          return [
            ...previous,
            ...(last?.role === "USER" && last.content === input.prompt ? [] : [optimistic]),
            response.message,
          ];
        },
      );
    },
    onError: (_error, input) => setDraft(input.prompt),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    },
  });
  const logout = useMutation({
    mutationFn: async () => {
      try {
        await api("users/me");
      } catch {
        /* Local cookies are still cleared by the logout proxy. */
      }
      await api("auth/logout", { method: "POST" });
    },
    onSettled: (_data, error) => {
      endSession();
      toast.add({
        title: "You’re signed out.",
        ...(error
          ? {
              description:
                "The server session could not be revoked. This browser’s session was cleared.",
              type: "warning",
            }
          : { type: "success" }),
      });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`conversations/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      if (workspace.conversationId === id) workspace.newChat();
      queryClient.removeQueries({ queryKey: ["messages", user?.id, id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setDeleteId(null);
      toast.add({ title: "Conversation deleted.", type: "success" });
    },
  });

  function sendPrompt() {
    if (!draft.trim() || send.isPending || session.isPending) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }
    send.mutate({ prompt: draft.trim(), webSearch, conversationId: workspace.conversationId });
  }
  function newChat() {
    workspace.newChat();
    send.reset();
    setDraft("");
  }
  function selectPrompt(prompt: string, search: boolean) {
    workspace.newChat();
    send.reset();
    setDraft(prompt);
    setWebSearch(search);
  }
  function navigate(view: WorkspaceView) {
    if (view === "chat") newChat();
    else {
      workspace.setView(view);
      send.reset();
    }
  }

  const visibleMessages: Message[] = (messages.data || []).map((message) => ({
    ...message,
    sources: message.sources ?? sources[message.id] ?? [],
  }));
  if (
    send.isPending &&
    send.variables &&
    workspace.conversationId &&
    !(
      visibleMessages.at(-1)?.role === "USER" &&
      visibleMessages.at(-1)?.content === send.variables.prompt
    )
  )
    visibleMessages.push({
      id: -1,
      role: "USER",
      content: send.variables.prompt,
      inputTokens: 0,
      outputTokens: 0,
      createdAt: "",
    });
  const showConversation = workspace.view === "chat" && !!workspace.conversationId;
  const name = user?.displayName || user?.email.split("@")[0];
  const viewLabel =
    workspace.view === "chat"
      ? "Conversations"
      : workspace.view === "search"
        ? "Web search"
        : workspace.view === "library"
          ? "Prompt library"
          : "Administration";
  const conversationTitle =
    conversations.data?.find((c) => c.id === workspace.conversationId)?.title ?? "New conversation";

  return (
    <>
      <a
        href="#main-content"
        className="bg-foreground text-background fixed -top-20 left-5 rounded-lg px-4 py-3 text-sm focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <AppSidebar
        user={user}
        usage={usage.data}
        conversations={conversations.data}
        loading={!!user && conversations.isPending}
        error={conversations.error}
        onRetry={() => conversations.refetch()}
        onNewChat={newChat}
        onNavigate={navigate}
        onConversation={(id) => {
          workspace.openConversation(id);
          send.reset();
        }}
        onDelete={setDeleteId}
        onAccount={setAccountTab}
        onSignIn={() => setAuthOpen(true)}
        onLogout={() => logout.mutate()}
        busy={send.isPending}
        loggingOut={logout.isPending}
      />
      <SidebarInset id="main-content" tabIndex={-1} className="h-dvh min-w-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-5 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {!openMobile && (
              <SidebarTrigger
                aria-label={
                  isMobile
                    ? "Open navigation"
                    : state === "expanded"
                      ? "Collapse navigation"
                      : "Expand navigation"
                }
                aria-expanded={isMobile ? openMobile : state === "expanded"}
              />
            )}
            <span className="truncate text-sm font-medium">
              {showConversation ? conversationTitle : viewLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {user && usage.data && (
              <Button variant="ghost" size="sm" onClick={() => setAccountTab("usage")}>
                <span className="tabular-nums">{usage.data.remaining.toLocaleString()}</span>
                <span className="hidden sm:inline">requests left</span>
              </Button>
            )}
            <ThemeToggle />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="About EchoGPT"
                    onClick={() => setHelpOpen(true)}
                  />
                }
              >
                <span className="text-base">?</span>
              </TooltipTrigger>
              <TooltipContent>About this workspace</TooltipContent>
            </Tooltip>
            {!user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuthOpen(true)}
                disabled={session.isPending}
              >
                Sign in
              </Button>
            )}
          </div>
        </header>
        {session.isError && (
          <div className="px-5 pb-3 md:px-8">
            <ErrorNotice
              error={session.error}
              title="Cannot connect to your account"
              onRetry={() => session.refetch()}
            />
          </div>
        )}
        <div className={cn("flex min-h-0 flex-1 flex-col", !showConversation && "overflow-y-auto")}>
          {workspace.view === "chat" && !showConversation && (
            <HomeWorkspace
              name={name?.split(" ")[0]}
              draft={draft}
              onDraftChange={setDraft}
              webSearch={webSearch}
              onWebSearchChange={setWebSearch}
              pending={send.isPending}
              onSend={sendPrompt}
              onLibrary={() => workspace.setView("library")}
              onPrompt={selectPrompt}
              error={send.error}
            />
          )}
          {showConversation && (
            <>
              <div className="mx-auto flex w-full max-w-3xl items-center justify-end px-5 pb-3 md:px-8">
                <Badge variant="outline" className="rounded-full">
                  AI conversation
                </Badge>
              </div>
              <div className="min-h-0 flex-1">
                {messages.isPending && !send.isPending ? (
                  <div className="mx-auto max-w-3xl px-5">
                    <LoadingRows count={2} />
                  </div>
                ) : messages.isError ? (
                  <div className="mx-auto max-w-3xl p-5">
                    <ErrorNotice
                      error={messages.error}
                      title="Couldn’t open this conversation"
                      onRetry={() => messages.refetch()}
                    />
                  </div>
                ) : (
                  <MessageList
                    key={workspace.conversationId}
                    messages={visibleMessages}
                    pending={send.isPending}
                  />
                )}
              </div>
              <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-3 px-5 pt-4 pb-4 md:px-8">
                {send.isError && <ErrorNotice error={send.error} title="Couldn’t get an answer" />}
                <Composer
                  value={draft}
                  onChange={setDraft}
                  webSearch={webSearch}
                  onWebSearchChange={setWebSearch}
                  pending={send.isPending}
                  onSend={sendPrompt}
                  onLibrary={() => workspace.setView("library")}
                  compact
                />
                <p className="type-caption text-muted-foreground text-center">
                  AI can make mistakes. Check important information.
                </p>
              </div>
            </>
          )}
          {workspace.view === "search" && (
            <SearchWorkspace
              key={user?.id ?? "guest"}
              user={user}
              onSignIn={() => setAuthOpen(true)}
            />
          )}
          {workspace.view === "library" && (
            <div className="mx-auto w-full max-w-5xl px-5 py-10 md:px-8">
              <PageHeading
                eyebrow="A nudge in the right direction"
                title="Start somewhere interesting."
                description="A few useful prompts to get things moving. Pick one, then make it yours."
                icon={BookOpen01Icon}
              />
              <PromptLibrary full onSelect={selectPrompt} />
            </div>
          )}
          {workspace.view === "admin" && user?.role === "ADMIN" && <AdminWorkspace user={user} />}
        </div>
      </SidebarInset>
      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={(user) => {
          queryClient.clear();
          queryClient.setQueryData(["session"], user);
          workspace.reset();
          setSources({});
          toast.add({
            title: user.displayName ? `Welcome, ${user.displayName}.` : "Welcome back.",
            type: "success",
          });
        }}
      />
      {user && accountTab && (
        <AccountDialog
          key={`${user.id}-${accountTab}`}
          open
          onClose={() => setAccountTab(null)}
          user={user}
          usage={usage.data}
          initialTab={accountTab}
          onSessionEnd={endSession}
          onNotice={(message) => toast.add({ title: message, type: "info" })}
        />
      )}
      <Modal
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="Your space to think"
        description="Chat and web search, together in one focused workspace."
      >
        <div className="flex flex-col gap-6">
          {[
            {
              icon: AiChat02Icon,
              title: "Talk it through",
              description:
                "Ask questions, work through a problem, or start a draft with your configured AI model.",
            },
            {
              icon: Globe02Icon,
              title: "Go a little deeper",
              description:
                "Turn on web search for answers grounded in sources, or explore sources directly in Web search.",
            },
            {
              icon: BookOpen01Icon,
              title: "Start with a nudge",
              description:
                "Find a prompt in the library, then make it your own. Enter sends. Shift + Enter adds a line.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <Icon icon={item.icon} size={20} />
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-medium">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
          <p className="type-caption text-muted-foreground">
            New conversations use the backend’s default provider. Model selection will be added
            later.
          </p>
        </div>
      </Modal>
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete this conversation?"
        description="This permanently removes the conversation and all its messages."
        confirmLabel="Delete conversation"
        onConfirm={() => {
          if (deleteId !== null) remove.mutate(deleteId);
        }}
        pending={remove.isPending}
        error={remove.error}
      />
    </>
  );
}
