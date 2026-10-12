"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { Icon } from "@/components/icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { prompts, promptCategories, type PromptCategory } from "@/lib/prompts";

export function PromptLibrary({
  onSelect,
  full = false,
}: {
  onSelect: (prompt: string, webSearch: boolean) => void;
  full?: boolean;
}) {
  const [category, setCategory] = useState<PromptCategory>("all");
  const visible =
    category === "all"
      ? prompts.slice(0, full ? prompts.length : 2)
      : prompts.filter((prompt) => prompt.category === category);
  return (
    <section className="flex flex-col gap-5" aria-label="Prompt starters">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-title">{full ? "Find a starting point" : "A few places to begin"}</h2>
        {!full && (
          <span className="type-caption text-muted-foreground">Pick a prompt. Make it yours.</span>
        )}
      </div>
      <ToggleGroup
        value={[category]}
        onValueChange={(values) => setCategory((values[0] || "all") as PromptCategory)}
        size="sm"
        spacing={1}
        aria-label="Prompt categories"
        className="max-w-full flex-wrap"
      >
        {promptCategories.map((item) => (
          <ToggleGroupItem key={item.id} value={item.id} aria-label={item.label}>
            <Icon icon={item.icon} data-icon="inline-start" />
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((item) => (
          <Card key={item.title} className="prompt-card flex flex-col transition-shadow">
            <CardHeader>
              <div className="mb-3 flex items-center justify-between">
                <Avatar size="lg">
                  <AvatarFallback>
                    <Icon icon={item.icon} />
                  </AvatarFallback>
                </Avatar>
                <span className="type-caption text-muted-foreground">
                  {promptCategories.find((category) => category.id === item.category)?.label}
                </span>
              </div>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelect(item.prompt, item.webSearch ?? false)}
              >
                Use this prompt
                <Icon icon={ArrowUpRight01Icon} data-icon="inline-end" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
