"use client";

import {
  Activity01Icon,
  Chat01Icon,
  DashboardSquare01Icon,
  Search01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorNotice, EmptyNotice, LoadingRows } from "@/components/feedback";
import { Icon } from "@/components/icon";
import { PageHeading } from "@/components/page-heading";
import { ProviderManagement } from "@/components/provider-management";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { User, Usage } from "@/lib/types";

interface AdminUser extends User {
  subscriptions: { plan: Usage["plan"]; status: Usage["status"] } | null;
}

interface RequestLog {
  requestId: number;
  userId: number;
  operation: string;
  status: string;
  latencyMs: number;
  createdAt: string;
}

type AdminTab = "users" | "request-logs";

const PLAN_OPTIONS = [
  { label: "Free", value: "FREE" },
  { label: "Premium", value: "PREMIUM" },
] as const;

const STAT_CARDS = [
  { key: "users", label: "Users", icon: UserGroupIcon, description: "Accounts in this workspace" },
  {
    key: "conversations",
    label: "Conversations",
    icon: Chat01Icon,
    description: "Conversations created",
  },
  { key: "searches", label: "Searches", icon: Search01Icon, description: "Searches completed" },
  {
    key: "requests",
    label: "Requests",
    icon: Activity01Icon,
    description: "API requests recorded",
  },
] as const;

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  return [days > 0 ? `${days}d` : null, hours > 0 ? `${hours}h` : null, `${minutes}m`]
    .filter(Boolean)
    .join(" ");
}

export function AdminWorkspace({ user }: { user: User }) {
  const [tab, setTab] = useState<AdminTab>("users");
  const [page, setPage] = useState(1);
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);
  const queryClient = useQueryClient();
  const dashboard = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: ({ signal }) =>
      api<{ users: number; conversations: number; searches: number; requests: number }>(
        "admin/dashboard",
        { signal },
      ),
  });
  const health = useQuery({
    queryKey: ["admin", "health"],
    queryFn: ({ signal }) =>
      api<{ database: string; databaseLatencyMs: number; uptimeSeconds: number }>("admin/health", {
        signal,
      }),
  });
  const users = useQuery({
    queryKey: ["admin", "users", page],
    queryFn: ({ signal }) => api<AdminUser[]>(`admin/users?page=${page}&limit=25`, { signal }),
    enabled: tab === "users",
  });
  const logs = useQuery({
    queryKey: ["admin", "request-logs", page],
    queryFn: ({ signal }) =>
      api<RequestLog[]>(`admin/request-logs?page=${page}&limit=25`, { signal }),
    enabled: tab === "request-logs",
  });
  const mutation = useMutation({
    mutationFn: ({
      id,
      action,
      value,
    }: {
      id: number;
      action: "status" | "subscription";
      value: string;
    }) =>
      api(`admin/users/${id}/${action}`, {
        method: "PATCH",
        body: JSON.stringify(action === "status" ? { status: value } : { plan: value }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      setStatusTarget(null);
    },
  });
  const activeQuery = tab === "users" ? users : logs;
  const recordCount = activeQuery.data?.length ?? 0;
  const recordNoun = tab === "users" ? "account" : "request";
  const isStatusMutationError = mutation.isError && mutation.variables?.action === "status";
  const columns =
    tab === "users"
      ? ["Person", "Role", "Plan", "Status", "Account action"]
      : ["Request", "User", "Operation", "Status", "Latency", "Created"];

  const recordsPanel = activeQuery.isPending ? (
    <Table aria-label="Loading records" aria-busy className="min-w-[40rem]">
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }, (_, index) => (
          <TableRow key={index}>
            {columns.map((column) => (
              <TableCell key={column}>
                <Skeleton className="h-4 w-16" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ) : activeQuery.isError ? (
    <ErrorNotice
      error={activeQuery.error}
      title="Could not load records"
      onRetry={() => activeQuery.refetch()}
    />
  ) : tab === "users" ? (
    users.data?.length ? (
      <Table aria-label="User accounts" className="min-w-[40rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Account action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.data.map((person) => (
            <TableRow key={person.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {(person.displayName || person.email).slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{person.displayName || "Unnamed user"}</span>
                    <span className="text-muted-foreground text-sm">{person.email}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{person.role.name === "ADMIN" ? "Admin" : "User"}</Badge>
              </TableCell>
              <TableCell>
                {person.subscriptions ? (
                  <Select
                    items={PLAN_OPTIONS}
                    value={person.subscriptions.plan}
                    onValueChange={(value) => {
                      if (value) mutation.mutate({ id: person.id, action: "subscription", value });
                    }}
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger
                      aria-label={`Plan for ${person.email}`}
                      size="sm"
                      className="w-28"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {PLAN_OPTIONS.map((plan) => (
                          <SelectItem key={plan.value} value={plan.value}>
                            {plan.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-muted-foreground text-sm">No subscription</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  className="status-badge"
                  data-status={person.status}
                  variant={person.status === "SUSPENDED" ? "destructive" : "outline"}
                >
                  {person.status === "ACTIVE" ? "Active" : "Suspended"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {person.id === user.id ? (
                  <Badge variant="secondary">Your account</Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() => setStatusTarget(person)}
                  >
                    {person.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ) : (
      <EmptyNotice
        icon={UserGroupIcon}
        title="No users on this page"
        description="There are no user records to show for this page."
        compact
      />
    )
  ) : logs.data?.length ? (
    <Table aria-label="API request logs" className="min-w-[44rem]">
      <TableHeader>
        <TableRow>
          <TableHead>Request</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Operation</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Latency</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.data.map((log) => (
          <TableRow key={log.requestId}>
            <TableCell className="font-mono text-sm tabular-nums">#{log.requestId}</TableCell>
            <TableCell className="font-mono text-sm tabular-nums">#{log.userId}</TableCell>
            <TableCell>
              <Badge variant="secondary">{log.operation}</Badge>
            </TableCell>
            <TableCell>
              <Badge
                className="status-badge"
                data-status={log.status}
                variant={log.status === "FAILED" ? "destructive" : "outline"}
              >
                {log.status === "SUCCESS"
                  ? "Success"
                  : log.status === "FAILED"
                    ? "Failed"
                    : log.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">{log.latencyMs} ms</TableCell>
            <TableCell>
              <time dateTime={log.createdAt} className="flex flex-col gap-1">
                <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                <span className="text-muted-foreground text-sm">
                  {new Date(log.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </time>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ) : (
    <EmptyNotice
      icon={Activity01Icon}
      title="No request logs on this page"
      description="There are no request log records to show for this page."
      compact
    />
  );

  return (
    <section
      className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8 md:py-10"
      aria-label="Administration"
    >
      <PageHeading
        eyebrow="Workspace administration"
        title="Workspace overview"
        description="Review account totals, connect AI providers, and manage users or request logs."
        icon={DashboardSquare01Icon}
      />

      {dashboard.isError ? (
        <ErrorNotice
          error={dashboard.error}
          title="Could not load dashboard totals"
          onRetry={() => dashboard.refetch()}
        />
      ) : dashboard.isPending ? (
        <LoadingRows count={1} />
      ) : (
        <section aria-label="Workspace totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_CARDS.map(({ key, label, icon, description }) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{label}</CardTitle>
                  <Icon icon={icon} className="text-muted-foreground" />
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-medium tabular-nums">
                  {dashboard.data[key].toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>System health</CardTitle>
            <CardDescription>Current database status and service uptime.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              health.refetch();
              dashboard.refetch();
              activeQuery.refetch();
            }}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {health.isError ? (
            <ErrorNotice
              error={health.error}
              title="System health unavailable"
              onRetry={() => health.refetch()}
            />
          ) : health.isPending ? (
            <p className="text-muted-foreground text-sm" role="status">
              Checking system health…
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Icon icon={Activity01Icon} className="text-muted-foreground" />
                <span className="text-muted-foreground">Database</span>
                <Badge variant="outline">{health.data.database}</Badge>
              </div>
              <span className="text-muted-foreground">
                Database latency{" "}
                <span className="text-foreground font-medium tabular-nums">
                  {health.data.databaseLatencyMs} ms
                </span>
              </span>
              <span className="text-muted-foreground">
                Uptime{" "}
                <span className="text-foreground font-medium tabular-nums">
                  {formatUptime(health.data.uptimeSeconds)}
                </span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <ProviderManagement />

      {mutation.isError && !isStatusMutationError && (
        <ErrorNotice error={mutation.error} title="Could not update the plan" />
      )}

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === "users" || value === "request-logs") {
            setTab(value);
            setPage(1);
          }
        }}
      >
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Accounts and requests</CardTitle>
              <CardDescription>
                Manage account access and review recent API activity.
              </CardDescription>
            </div>
            <TabsList aria-label="Admin tables">
              <TabsTrigger value="users">Users & plans</TabsTrigger>
              <TabsTrigger value="request-logs">Request logs</TabsTrigger>
            </TabsList>
          </CardHeader>
          <TabsContent value="users" className="mt-0">
            <CardContent>
              {tab === "users" && (
                <div className="admin-records-table min-w-0 overflow-hidden rounded-lg border">
                  {recordsPanel}
                </div>
              )}
            </CardContent>
          </TabsContent>
          <TabsContent value="request-logs" className="mt-0">
            <CardContent>
              {tab === "request-logs" && (
                <div className="admin-records-table min-w-0 overflow-hidden rounded-lg border">
                  {recordsPanel}
                </div>
              )}
            </CardContent>
          </TabsContent>
          <CardFooter className="flex flex-wrap justify-between gap-4">
            <div className="text-muted-foreground flex flex-col gap-1 text-sm tabular-nums">
              <span>Page {page}</span>
              {activeQuery.isSuccess && (
                <span>
                  {recordCount} {recordNoun}
                  {recordCount === 1 ? "" : "s"} on this page
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || activeQuery.isFetching}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(activeQuery.data?.length ?? 0) < 25 || activeQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        </Card>
      </Tabs>

      <AlertDialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.status === "ACTIVE" ? "Suspend this user?" : "Activate this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.status === "ACTIVE"
                ? "They will be signed out of every device and cannot sign in until reactivated."
                : "They will be able to sign in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-muted-foreground text-sm">{statusTarget?.email}</p>
          {isStatusMutationError && (
            <ErrorNotice
              error={mutation.error}
              title="Could not update account status"
              onRetry={() => {
                if (statusTarget) {
                  mutation.mutate({
                    id: statusTarget.id,
                    action: "status",
                    value: statusTarget.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                  });
                }
              }}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant={statusTarget?.status === "ACTIVE" ? "destructive" : "default"}
              disabled={mutation.isPending}
              onClick={() => {
                if (statusTarget) {
                  mutation.mutate({
                    id: statusTarget.id,
                    action: "status",
                    value: statusTarget.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                  });
                }
              }}
            >
              {mutation.isPending ? "Updating…" : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
