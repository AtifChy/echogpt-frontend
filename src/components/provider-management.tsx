"use client";

import { AiChat02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyNotice, ErrorNotice, LoadingRows } from "@/components/feedback";
import { Icon } from "@/components/icon";
import { ProviderDialog } from "@/components/provider-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { PROVIDER_TYPES } from "@/lib/providers";
import type { AiProvider } from "@/lib/types";

type ProviderAction = "enabled" | "default" | "delete" | "health";
interface ActionTarget {
  provider: AiProvider;
  action: ProviderAction;
}

export function ProviderManagement() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<{ provider: AiProvider | null } | null>(null);
  const [confirmation, setConfirmation] = useState<ActionTarget | null>(null);
  const providers = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: ({ signal }) => api<AiProvider[]>("admin/providers", { signal }),
  });
  const action = useMutation({
    mutationFn: async ({ provider, action }: ActionTarget) => {
      const path = `admin/providers/${provider.id}`;
      if (action === "delete") return api<void>(path, { method: "DELETE" });
      if (action === "health") {
        const health = await api<{ status: string; latency: number }>(`${path}/health`, {
          method: "POST",
          body: "{}",
        });
        return health;
      }
      await api(`${path}/${action}`, {
        method: action === "default" ? "PUT" : "PATCH",
        body: JSON.stringify(action === "enabled" ? { enabled: !provider.enabled } : {}),
      });
    },
    onSuccess: (result, { provider, action: operation }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      setConfirmation(null);
      toast.add({
        title:
          operation === "health"
            ? `${provider.name} responded.`
            : operation === "delete"
              ? "Provider deleted."
              : operation === "default"
                ? "Default provider updated."
                : provider.enabled
                  ? "Provider disabled."
                  : "Provider enabled.",
        ...(operation === "health" && result
          ? { description: `Response time: ${result.latency} ms.` }
          : {}),
        type: "success",
      });
    },
  });

  function requestAction(target: ActionTarget) {
    action.reset();
    if (
      target.action === "delete" ||
      target.action === "health" ||
      (target.action === "enabled" && target.provider.enabled && target.provider.isDefault)
    ) {
      setConfirmation(target);
    } else {
      action.mutate(target);
    }
  }

  const defaultProvider = providers.data?.find(
    (provider) => provider.isDefault && provider.enabled,
  );

  return (
    <section aria-label="AI providers" className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>AI providers</CardTitle>
            <CardDescription>
              Connect OpenAI, Claude, or Gemini. New conversations use the enabled default provider.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => providers.refetch()}
              disabled={providers.isFetching || action.isPending}
            >
              Refresh providers
            </Button>
            <Button onClick={() => setEditor({ provider: null })} disabled={action.isPending}>
              <Icon icon={PlusSignIcon} data-icon="inline-start" />
              Add provider
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {action.isError && !confirmation && (
            <ErrorNotice error={action.error} title="Could not update provider" />
          )}
          {providers.isPending ? (
            <LoadingRows count={2} />
          ) : providers.isError ? (
            <ErrorNotice
              error={providers.error}
              title="Could not load providers"
              onRetry={() => providers.refetch()}
            />
          ) : providers.data.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {providers.data.map((provider) => (
                <Card key={provider.id} size="sm">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="break-words">{provider.name}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        {provider.isDefault && <Badge>Default</Badge>}
                        <Badge
                          variant="outline"
                          className="status-badge"
                          data-status={provider.enabled ? "ACTIVE" : "DISABLED"}
                        >
                          {provider.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {PROVIDER_TYPES.find((type) => type.value === provider.type)?.label ??
                        provider.type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <p className="font-mono text-sm break-all">{provider.model}</p>
                    <p className="text-muted-foreground text-sm">
                      API key stored in backend · hidden
                    </p>
                    {provider.isDefault && !provider.enabled && (
                      <p className="text-destructive text-sm">
                        Enable this provider or choose another default to start chats.
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-3">
                    <div
                      className="flex flex-wrap gap-2"
                      aria-label={`Actions for ${provider.name}`}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={action.isPending}
                        onClick={() => setEditor({ provider })}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={action.isPending}
                        onClick={() => requestAction({ provider, action: "enabled" })}
                      >
                        {provider.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={action.isPending || !provider.enabled || provider.isDefault}
                        onClick={() => requestAction({ provider, action: "default" })}
                      >
                        Make default
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={action.isPending || !provider.enabled}
                        onClick={() => requestAction({ provider, action: "health" })}
                      >
                        Check health
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={action.isPending || provider.isDefault}
                        onClick={() => requestAction({ provider, action: "delete" })}
                      >
                        Delete
                      </Button>
                    </div>
                    {provider.isDefault && (
                      <p className="text-muted-foreground text-sm">
                        Choose another default before deleting this provider.
                      </p>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyNotice
              icon={AiChat02Icon}
              title="No providers connected"
              description="Add a provider with your API key, enable it, then make it the default to start chatting."
              compact
            />
          )}
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-sm" role="status">
            {providers.isSuccess
              ? defaultProvider
                ? `Default for new conversations: ${defaultProvider.name}.`
                : "No enabled default provider. Add or enable a provider, then select Make default."
              : "Provider keys are encrypted by the backend and never returned to this page."}
          </p>
        </CardFooter>
      </Card>

      {editor && (
        <ProviderDialog
          provider={editor.provider}
          onClose={() => setEditor(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
            toast.add({
              title: editor.provider
                ? "Provider updated."
                : "Provider added. Enable it when ready.",
              type: "success",
            });
          }}
        />
      )}

      <ConfirmDialog
        open={confirmation?.action === "delete"}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title="Delete this provider?"
        description={`This permanently removes ${confirmation?.provider.name ?? "this provider"} and its stored API key. Conversations using it will no longer be able to send messages.`}
        confirmLabel="Delete provider"
        pending={action.isPending}
        error={action.isError ? action.error : undefined}
        onConfirm={() => {
          if (confirmation) action.mutate(confirmation);
        }}
      />

      <AlertDialog
        open={!!confirmation && confirmation.action !== "delete"}
        onOpenChange={(open) => {
          if (!open && !action.isPending) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation?.action === "health"
                ? "Send a test request?"
                : "Disable the default provider?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.action === "health"
                ? `This sends a small real AI request to ${confirmation.provider.name}. Your provider may charge for it.`
                : "New chats will be unavailable until you enable this provider again or choose another enabled default. Existing chats using it will also stop sending messages."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {action.isError && <ErrorNotice error={action.error} title="Provider action failed" />}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={action.isPending}>Cancel</AlertDialogCancel>
            <Button
              disabled={action.isPending}
              onClick={() => {
                if (confirmation) action.mutate(confirmation);
              }}
            >
              {action.isPending && <Spinner data-icon="inline-start" />}
              {action.isPending
                ? "Working…"
                : confirmation?.action === "health"
                  ? "Send test request"
                  : "Disable provider"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
