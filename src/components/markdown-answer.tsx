"use client";

import { isValidElement } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { safeSourceUrl } from "@/lib/sources";

export function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div className="markdown-answer min-w-0 text-base leading-7 wrap-anywhere">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={["img"]}
        urlTransform={(url) => (url.startsWith("#") ? url : (safeSourceUrl(url) ?? ""))}
        components={{
          a: ({ href, children }) =>
            href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          pre: ({ children }) => {
            const language = isValidElement<{ className?: string }>(children)
              ? children.props.className?.replace(/^language-/, "")
              : undefined;
            return (
              <div className="bg-code-surface text-code-foreground border-code-border overflow-hidden rounded-xl border">
                <div className="type-code text-code-muted border-code-border border-b px-5 py-2">
                  {language || "code"}
                </div>
                <pre className="type-code overflow-x-auto p-5">{children}</pre>
              </div>
            );
          },
          table: ({ children }) => (
            <div className="min-w-0 overflow-hidden rounded-lg border">
              <Table>{children}</Table>
            </div>
          ),
          thead: ({ children }) => <TableHeader>{children}</TableHeader>,
          tbody: ({ children }) => <TableBody>{children}</TableBody>,
          tr: ({ children }) => <TableRow>{children}</TableRow>,
          th: ({ children, style }) => <TableHead style={style}>{children}</TableHead>,
          td: ({ children, style }) => <TableCell style={style}>{children}</TableCell>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
