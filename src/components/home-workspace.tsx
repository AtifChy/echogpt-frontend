import {
  ArrowUpRight01Icon,
  BookOpen01Icon,
  CodeIcon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";

import { Composer } from "@/components/composer";
import { ErrorNotice } from "@/components/feedback";
import { Icon } from "@/components/icon";
import { PromptLibrary } from "@/components/prompt-library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function HomeWorkspace({
  name,
  draft,
  onDraftChange,
  webSearch,
  onWebSearchChange,
  pending,
  onSend,
  onLibrary,
  onPrompt,
  error,
}: {
  name?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  webSearch: boolean;
  onWebSearchChange: (value: boolean) => void;
  pending: boolean;
  onSend: () => void;
  onLibrary: () => void;
  onPrompt: (prompt: string, webSearch: boolean) => void;
  error?: unknown;
}) {
  return (
    <div className="flex flex-col pb-10">
      <div className="home-hero">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-9 px-5 pt-12 pb-10 sm:px-8 sm:pt-16">
          <header className="flex flex-col items-center gap-5 text-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="type-eyebrow text-muted-foreground">Your space to think</span>
              <Badge variant="outline" className="rounded-full">
                Default model
              </Badge>
            </div>
            <h1 className="type-display-hero max-w-full">
              {name ? `Where should we start, ${name}?` : "What can we work on?"}
            </h1>
            <p className="text-muted-foreground max-w-[65ch] text-base leading-relaxed">
              Ask a question, start a draft, or explore something new.
            </p>
          </header>
          <section aria-label="Start a conversation" className="flex flex-col gap-4">
            <Composer
              value={draft}
              onChange={onDraftChange}
              webSearch={webSearch}
              onWebSearchChange={onWebSearchChange}
              pending={pending}
              onSend={onSend}
              onLibrary={onLibrary}
            />
            {Boolean(error) && <ErrorNotice error={error} title="Couldn’t get an answer" />}
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onPrompt("Help me write a clear first draft from these notes:\n\n", false)
                }
              >
                <Icon icon={PencilEdit01Icon} data-icon="inline-start" />
                Write something
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onPrompt(
                    "Explain this concept with a simple example, then build up to the details: ",
                    false,
                  )
                }
              >
                <Icon icon={BookOpen01Icon} data-icon="inline-start" />
                Learn something
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPrompt("Help me understand and debug this code:\n\n", false)}
              >
                <Icon icon={CodeIcon} data-icon="inline-start" />
                Help me code
              </Button>
            </div>
          </section>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 sm:px-8">
        <PromptLibrary onSelect={onPrompt} />
        <footer className="type-caption text-muted-foreground flex flex-wrap items-center justify-between gap-3 pb-2">
          <span>Different perspectives. One focused workspace.</span>
          <Button variant="link" size="sm" onClick={onLibrary}>
            More starting points
            <Icon icon={ArrowUpRight01Icon} data-icon="inline-end" />
          </Button>
        </footer>
      </div>
    </div>
  );
}
