"use client";

import { ArrowUp02Icon, Globe02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/icon";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  webSearch,
  onWebSearchChange,
  pending,
  onSend,
  onLibrary,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  webSearch: boolean;
  onWebSearchChange: (value: boolean) => void;
  pending: boolean;
  onSend: () => void;
  onLibrary: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <InputGroup data-disabled={pending} className="composer bg-card">
        <label className="sr-only" htmlFor="prompt">
          Your prompt
        </label>
        <InputGroupTextarea
          id="prompt"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={20_000}
          placeholder={
            compact
              ? "Keep the conversation going…"
              : "Ask a question, or describe what you’d like to get done…"
          }
          rows={compact ? 2 : 3}
          disabled={pending}
          className={cn("max-h-64 px-5 pt-5", compact ? "min-h-16" : "min-h-28")}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (value.trim() && !pending) onSend();
            }
          }}
        />
        <InputGroupAddon align="block-end" className="justify-between gap-3 px-4 pb-4">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <InputGroupButton
                    size="icon-sm"
                    aria-label="Browse prompt starters"
                    onClick={onLibrary}
                    disabled={pending}
                  />
                }
              >
                <Icon icon={PlusSignIcon} />
              </TooltipTrigger>
              <TooltipContent>Browse prompt starters</TooltipContent>
            </Tooltip>
            <Separator
              orientation="vertical"
              className="data-orientation:vertical:self-center data-orientation:vertical:h-4"
            />
            <Toggle
              className="web-search-toggle pl-2"
              variant="outline"
              size="sm"
              pressed={webSearch}
              onPressedChange={onWebSearchChange}
              disabled={pending}
              aria-label="Web search"
            >
              <Icon icon={Globe02Icon} data-icon="inline-start" />
              Web search
            </Toggle>
          </div>
          <div className="flex items-center gap-3">
            <span className="type-caption hidden sm:inline">
              {pending ? "Waiting for your answer…" : "Enter to send"}
            </span>
            <InputGroupButton
              variant="default"
              size="icon-sm"
              className="size-10"
              aria-label="Send message"
              disabled={!value.trim() || pending}
              onClick={onSend}
            >
              {pending ? <Spinner /> : <Icon icon={ArrowUp02Icon} />}
            </InputGroupButton>
          </div>
        </InputGroupAddon>
      </InputGroup>
      {!compact && (
        <div className="type-caption text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>
            {webSearch
              ? "Web search on · 2 requests per message"
              : "Uses your configured default AI model"}
          </span>
          <span>Shift + Enter for a new line</span>
        </div>
      )}
    </div>
  );
}
