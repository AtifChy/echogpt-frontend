"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { Icon, EchoMark } from "@/components/icon";
import { MarkdownAnswer } from "@/components/markdown-answer";
import { Sources } from "@/components/sources";
import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Message, MessageContent, MessageHeader, MessageFooter } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import type { Message as ApiMessage } from "@/lib/types";

export function MessageList({ messages, pending }: { messages: ApiMessage[]; pending: boolean }) {
  const [copied, setCopied] = useState<number | null>(null);
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller>
        <MessageScrollerViewport aria-label="Conversation messages" aria-busy={pending}>
          <MessageScrollerContent className="mx-auto max-w-3xl px-5 py-8 md:px-8">
            {messages
              .filter((message) => message.role !== "SYSTEM")
              .map((message) => (
                <MessageScrollerItem
                  key={message.id}
                  messageId={String(message.id)}
                  scrollAnchor={message.role === "USER"}
                >
                  <Message align={message.role === "USER" ? "end" : "start"}>
                    <MessageContent>
                      {message.role === "ASSISTANT" && (
                        <MessageHeader className="gap-2">
                          <EchoMark />
                          <span>EchoGPT</span>
                        </MessageHeader>
                      )}
                      <Bubble
                        align={message.role === "USER" ? "end" : "start"}
                        variant={message.role === "USER" ? "muted" : "ghost"}
                      >
                        <BubbleContent>
                          {message.role === "USER" ? (
                            <p className="text-base leading-7 whitespace-pre-wrap">
                              {message.content}
                            </p>
                          ) : (
                            <MarkdownAnswer content={message.content} />
                          )}
                        </BubbleContent>
                      </Bubble>
                      {message.sources?.length ? (
                        <div className="pt-3">
                          <Sources sources={message.sources} compact />
                        </div>
                      ) : null}
                      {message.role === "ASSISTANT" && (
                        <MessageFooter className="gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={copied === message.id ? "Response copied" : "Copy response"}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(message.content);
                                setCopied(message.id);
                              } catch {
                                toast.add({
                                  title: "Unable to copy",
                                  description: "Select the response text to copy it.",
                                  type: "error",
                                });
                              }
                            }}
                          >
                            <Icon icon={copied === message.id ? Tick02Icon : Copy01Icon} />
                          </Button>
                          {copied === message.id && <span>Copied</span>}
                        </MessageFooter>
                      )}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
            {pending && (
              <MessageScrollerItem messageId="pending">
                <div className="flex flex-col gap-5" role="status">
                  <Marker>
                    <MarkerContent>
                      <Badge
                        variant="secondary"
                        className="bg-timeline-thinking text-timeline-foreground"
                      >
                        Thinking
                      </Badge>
                    </MarkerContent>
                  </Marker>
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
