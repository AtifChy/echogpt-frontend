"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorNotice } from "@/components/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import type { Usage, User } from "@/lib/types";

export function AccountDialog({
  open,
  onClose,
  user,
  usage,
  initialTab,
  onSessionEnd,
  onNotice,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
  usage?: Usage;
  initialTab: "profile" | "usage";
  onSessionEnd: () => void;
  onNotice: (message: string) => void;
}) {
  const [tab, setTab] = useState<string>(initialTab);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const formId = useId();
  const queryClient = useQueryClient();
  const profile = useMutation({
    mutationFn: (form: FormData) =>
      api<User>("users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: String(form.get("displayName")).trim() }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["session"], updated);
      toast.add({ title: "Your profile is updated.", type: "success" });
    },
  });
  const password = useMutation({
    mutationFn: async (form: FormData) => {
      await api("users/me");
      return api("users/me/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
        }),
      });
    },
    onSuccess: () => {
      onClose();
      onSessionEnd();
      onNotice("Password updated. Sign in again with your new password.");
    },
  });
  const remove = useMutation({
    mutationFn: () => api("users/me", { method: "DELETE" }),
    onSuccess: () => {
      onClose();
      onSessionEnd();
      onNotice("Your account has been deleted.");
    },
  });
  const wrongPassword = password.error instanceof ApiError && password.error.status === 401;

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value && !password.isPending && !remove.isPending) onClose();
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Account settings</SheetTitle>
          <SheetDescription>A few things that make this space yours.</SheetDescription>
        </SheetHeader>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(String(value))}
          className="gap-6 px-6 pb-8"
        >
          <TabsList className="w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="usage">Plan & usage</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                profile.mutate(new FormData(event.currentTarget));
              }}
            >
              <FieldGroup className="gap-5">
                <Field data-disabled={profile.isPending}>
                  <FieldLabel htmlFor={formId + "-name"}>Display name</FieldLabel>
                  <Input
                    id={formId + "-name"}
                    name="displayName"
                    defaultValue={user.displayName || ""}
                    placeholder="Your name"
                    maxLength={80}
                    minLength={1}
                    required
                    disabled={profile.isPending}
                  />
                </Field>
                <Field data-disabled>
                  <FieldLabel htmlFor={formId + "-email"}>Email address</FieldLabel>
                  <Input id={formId + "-email"} value={user.email} disabled readOnly />
                  <FieldDescription>
                    Your email is linked to your sign-in and can’t be changed here.
                  </FieldDescription>
                </Field>
                {profile.isError && (
                  <ErrorNotice error={profile.error} title="Couldn’t save your profile" />
                )}
                <Button type="submit" className="w-fit" disabled={profile.isPending}>
                  {profile.isPending && <Spinner data-icon="inline-start" />}Save changes
                </Button>
              </FieldGroup>
            </form>
          </TabsContent>
          <TabsContent value="usage" className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium">
                {usage ? `EchoGPT ${usage.plan === "PREMIUM" ? "Premium" : "Free"}` : "Your plan"}
              </h3>
              {usage && (
                <Badge variant="secondary" className="rounded-full">
                  {usage.status}
                </Badge>
              )}
            </div>
            {usage ? (
              <>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-normal tracking-tight tabular-nums">
                      {usage.remaining.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm">requests remaining</p>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    of {usage.limit.toLocaleString()}
                  </span>
                </div>
                <Progress
                  className="[--primary:var(--foreground)]"
                  value={Math.min(100, (usage.used / Math.max(usage.limit, 1)) * 100)}
                  aria-label="Requests used this period"
                />
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {usage.used.toLocaleString()} used this period. Resets{" "}
                  {new Date(usage.periodEnd).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                  })}
                  .
                </p>
                <Separator />
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A chat message or a web search uses one request. Chat with web search uses two.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Usage information is unavailable. Close this panel and try again shortly.
              </p>
            )}
            <Separator />
            <div className="flex flex-col gap-2">
              <h4 className="text-base font-medium">Need more room?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Plan changes are managed by your workspace administrator. Ask them about upgrading
                to Premium.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="security" className="flex flex-col gap-7">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                password.mutate(new FormData(event.currentTarget));
              }}
            >
              <FieldGroup className="gap-5">
                <h3 className="text-base font-medium">Change password</h3>
                <Field data-invalid={wrongPassword} data-disabled={password.isPending}>
                  <FieldLabel htmlFor={formId + "-current-password"}>Current password</FieldLabel>
                  <Input
                    id={formId + "-current-password"}
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    aria-invalid={wrongPassword}
                    disabled={password.isPending}
                  />
                </Field>
                <Field data-disabled={password.isPending}>
                  <FieldLabel htmlFor={formId + "-new-password"}>New password</FieldLabel>
                  <Input
                    id={formId + "-new-password"}
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={10}
                    placeholder="At least 10 characters"
                    disabled={password.isPending}
                  />
                  <FieldDescription>
                    Changing your password signs you out of every device.
                  </FieldDescription>
                </Field>
                {password.isError && (
                  <ErrorNotice error={password.error} title="Couldn’t update your password" />
                )}
                <Button type="submit" className="w-fit" disabled={password.isPending}>
                  {password.isPending && <Spinner data-icon="inline-start" />}Update password
                </Button>
              </FieldGroup>
            </form>
            <Separator />
            <div className="flex flex-col items-start gap-3">
              <h3 className="text-base font-medium">Delete account</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Permanently delete your account, conversations, and searches.
              </p>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete my account
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete your account?"
          description="This cannot be undone. Your account, conversations, and searches will be permanently removed."
          confirmLabel="Permanently delete account"
          onConfirm={() => remove.mutate()}
          pending={remove.isPending}
          disabled={confirmation !== "DELETE"}
          error={remove.error}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={formId + "-delete"}>Type DELETE to confirm</FieldLabel>
              <Input
                id={formId + "-delete"}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
            </Field>
          </FieldGroup>
        </ConfirmDialog>
      </SheetContent>
    </Sheet>
  );
}
