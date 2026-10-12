"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Modal } from "@/components/app-modal";
import { ErrorNotice } from "@/components/feedback";
import { EchoMark, Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export function AuthDialog({
  open,
  onClose,
  onAuthenticated,
}: {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: User) => void;
}) {
  const [register, setRegister] = useState(false);
  const formId = useId();
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      await api("auth/" + (register ? "register" : "login"), {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email")).trim(),
          password: form.get("password"),
          ...(register ? { displayName: String(form.get("displayName")).trim() } : {}),
        }),
      });
      return api<User>("users/me");
    },
    onSuccess: (user) => {
      onAuthenticated(user);
      onClose();
    },
  });
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!value && !mutation.isPending) onClose();
      }}
      title={register ? "A fresh space for your ideas" : "Welcome back"}
      description={
        register
          ? "Create your account and start exploring."
          : "Sign in to pick up where you left off."
      }
    >
      <div className="flex justify-center py-1">
        <EchoMark className="text-primary size-10" />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(new FormData(event.currentTarget));
        }}
      >
        <FieldGroup className="gap-5">
          {register && (
            <Field data-disabled={mutation.isPending}>
              <FieldLabel htmlFor={formId + "-name"}>Your name</FieldLabel>
              <Input
                id={formId + "-name"}
                name="displayName"
                autoComplete="name"
                placeholder="What should we call you?"
                required
                maxLength={80}
                disabled={mutation.isPending}
              />
            </Field>
          )}
          <Field data-disabled={mutation.isPending}>
            <FieldLabel htmlFor={formId + "-email"}>Email address</FieldLabel>
            <Input
              id={formId + "-email"}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              disabled={mutation.isPending}
            />
          </Field>
          <Field data-disabled={mutation.isPending}>
            <FieldLabel htmlFor={formId + "-password"}>Password</FieldLabel>
            <Input
              id={formId + "-password"}
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              placeholder={register ? "At least 10 characters" : "Your password"}
              required
              minLength={register ? 10 : 1}
              disabled={mutation.isPending}
            />
            {register && <FieldDescription>Use at least 10 characters.</FieldDescription>}
          </Field>
          {mutation.isError && (
            <ErrorNotice
              error={mutation.error}
              title={register ? "Couldn’t create your account" : "Couldn’t sign you in"}
            />
          )}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                One moment…
              </>
            ) : (
              <>
                {register ? "Create account" : "Sign in"}
                <Icon icon={ArrowRight01Icon} data-icon="inline-end" />
              </>
            )}
          </Button>
        </FieldGroup>
      </form>
      <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-1 text-sm">
        <span>{register ? "Already have an account?" : "New to EchoGPT?"}</span>
        <Button
          variant="link"
          size="sm"
          onClick={() => {
            setRegister(!register);
            mutation.reset();
          }}
          disabled={mutation.isPending}
        >
          {register ? "Sign in" : "Create an account"}
        </Button>
      </div>
      <Separator />
      <p className="type-caption text-muted-foreground text-center">
        Your conversations are saved to your account.
      </p>
    </Modal>
  );
}
