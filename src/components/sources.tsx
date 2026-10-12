"use client";

import { ArrowDown01Icon, ArrowUp01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { useId, useState } from "react";

import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sourceLinks } from "@/lib/sources";
import type { Source } from "@/lib/types";

export function Sources({ sources, compact = false }: { sources: Source[]; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const links = sourceLinks(sources);
  if (!links.length) return null;

  if (compact)
    return (
      <section className="flex min-w-0 flex-col gap-2" aria-label="Response sources">
        <div className="flex items-center justify-between gap-3">
          <span className="type-caption text-muted-foreground">
            {links.length} {links.length === 1 ? "source" : "sources"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide sources" : "View all sources"}
            <Icon icon={expanded ? ArrowUp01Icon : ArrowDown01Icon} data-icon="inline-end" />
          </Button>
        </div>
        {!expanded && (
          <div className="flex flex-wrap gap-2">
            {links.slice(0, 3).map((source) => (
              <Button
                key={source.citation + "-" + source.url}
                variant="outline"
                size="sm"
                className="max-w-full justify-start"
                nativeButton={false}
                render={<a href={source.href} target="_blank" rel="noopener noreferrer" />}
                aria-label={`Source ${source.citation}: ${source.title} (${source.domain})`}
                title={source.title}
              >
                <Badge variant="secondary">{source.citation}</Badge>
                <span className="truncate">{source.domain}</span>
              </Button>
            ))}
            {links.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={expanded}
                aria-controls={detailsId}
                onClick={() => setExpanded(true)}
              >
                +{links.length - 3} more
              </Button>
            )}
          </div>
        )}
        <div id={detailsId} hidden={!expanded}>
          <ol className="divide-border flex flex-col divide-y">
            {links.map((source) => (
              <li key={source.citation + "-" + source.url}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-detail group outline-ring flex items-start gap-3 rounded-lg px-2 py-3 focus-visible:outline-2"
                >
                  <Badge variant="secondary">{source.citation}</Badge>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="line-clamp-2 text-sm leading-5 font-medium">
                      {source.title || source.domain}
                    </span>
                    <span className="type-caption text-muted-foreground truncate">
                      {source.domain}
                    </span>
                  </span>
                  <Icon icon={ArrowUpRight01Icon} className="text-muted-foreground shrink-0" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.map((source) => (
        <a
          key={source.citation + "-" + source.url}
          href={source.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group outline-ring block min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <Card size="sm" className="source-card h-full transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <span className="type-caption text-muted-foreground truncate">
                  {source.citation}. {source.domain}
                </span>
                <Icon icon={ArrowUpRight01Icon} />
              </div>
              <CardTitle className="line-clamp-2">{source.title || source.domain}</CardTitle>
              {source.snippets?.length ? (
                <CardDescription className="line-clamp-2">
                  {source.snippets.join(" ")}
                </CardDescription>
              ) : null}
            </CardHeader>
          </Card>
        </a>
      ))}
    </div>
  );
}
