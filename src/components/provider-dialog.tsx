"use client";

import { useMutation } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";

import { Modal } from "@/components/app-modal";
import { ErrorNotice } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { PROVIDER_TYPES, providerPayload } from "@/lib/providers";
import type { AiProvider, ProviderType } from "@/lib/types";

export function ProviderDialog({
  provider,
  onClose,
  onSaved,
}: {
  provider: AiProvider | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<ProviderType>(provider?.type ?? "OPENAI");
  const mutation = useMutation({
    // Read the key only when submitting. Never retain it in query/mutation variables
    // or preload the saved key; the backend does not return provider credentials.
    mutationFn: async () => {
      if (!formRef.current) throw new Error("The provider form is unavailable.");
      const body = providerPayload(new FormData(formRef.current), !!provider);
      await api(provider ? `admin/providers/${provider.id}` : "admin/providers", {
        method: provider ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      formRef.current?.reset();
      onSaved();
      onClose();
    },
  });

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
      title={provider ? "Edit provider" : "Add AI provider"}
      description={
        provider
          ? "Update this configuration. Leave the API key blank to keep the existing key."
          : "Connect an AI model. New providers start disabled so you can review them first."
      }
    >
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <FieldGroup className="gap-5">
          <Field data-disabled={mutation.isPending}>
            <FieldLabel htmlFor={formId + "-name"}>Provider name</FieldLabel>
            <Input
              id={formId + "-name"}
              name="name"
              defaultValue={provider?.name}
              placeholder="My OpenAI provider"
              required
              maxLength={80}
              disabled={mutation.isPending}
            />
          </Field>
          <Field data-disabled={!!provider || mutation.isPending}>
            <FieldLabel htmlFor={formId + "-type"}>Provider type</FieldLabel>
            <Select
              items={PROVIDER_TYPES}
              value={type}
              onValueChange={(value) => {
                if (value) setType(value as ProviderType);
              }}
              disabled={!!provider || mutation.isPending}
            >
              <SelectTrigger id={formId + "-type"} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PROVIDER_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <input type="hidden" name="type" value={type} />
            {provider && (
              <FieldDescription>To change the type, add a new provider.</FieldDescription>
            )}
          </Field>
          <Field data-disabled={mutation.isPending}>
            <FieldLabel htmlFor={formId + "-model"}>Model ID</FieldLabel>
            <Input
              id={formId + "-model"}
              name="model"
              defaultValue={provider?.model}
              placeholder="Enter the model ID from your provider"
              required
              maxLength={100}
              disabled={mutation.isPending}
            />
            <FieldDescription>Use a model your API key has access to.</FieldDescription>
          </Field>
          <Field data-disabled={mutation.isPending}>
            <FieldLabel htmlFor={formId + "-key"}>
              {provider ? "Replacement API key (optional)" : "API key"}
            </FieldLabel>
            <Input
              id={formId + "-key"}
              name="apiKey"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={provider ? "Leave blank to keep the saved key" : "Paste your API key"}
              required={!provider}
              minLength={10}
              disabled={mutation.isPending}
            />
            <FieldDescription>
              Sent to your backend for encrypted storage. Saved keys are never displayed.
            </FieldDescription>
          </Field>
          {mutation.isError && (
            <ErrorNotice error={mutation.error} title="Could not save provider" />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" type="button" disabled={mutation.isPending} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              {mutation.isPending ? "Saving…" : provider ? "Save changes" : "Add provider"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </Modal>
  );
}
