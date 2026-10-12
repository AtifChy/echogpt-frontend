"use client";

import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Clock01Icon,
  Globe02Icon,
  Search01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";

import { ErrorNotice, EmptyNotice, LoadingRows } from "@/components/feedback";
import { Icon } from "@/components/icon";
import { PageHeading } from "@/components/page-heading";
import { Sources } from "@/components/sources";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroupAddon } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { SearchRecord, SearchResult, User } from "@/lib/types";

const freshnessOptions = [
  { label: "Any time", value: null },
  { label: "Past day", value: "pd" },
  { label: "Past week", value: "pw" },
  { label: "Past month", value: "pm" },
  { label: "Past year", value: "py" },
];

export function SearchWorkspace({ user, onSignIn }: { user: User | null; onSignIn: () => void }) {
  const [query, setQuery] = useState("");
  const [freshness, setFreshness] = useState("");
  const [focused, setFocused] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim());
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: ["search-history", user?.id],
    queryFn: ({ signal }) => api<SearchRecord[]>("search/history", { signal }),
    enabled: !!user,
  });
  const suggestions = useQuery({
    queryKey: ["suggestions", user?.id, deferredQuery],
    queryFn: ({ signal }) =>
      api<string[]>(`search/suggestions?q=${encodeURIComponent(deferredQuery)}`, { signal }),
    enabled: !!user && focused && deferredQuery.length >= 2,
  });
  const search = useMutation({
    mutationFn: () =>
      api<SearchResult>("search", {
        method: "POST",
        body: JSON.stringify({
          query: query.trim(),
          count: 10,
          safesearch: "moderate",
          ...(freshness ? { freshness } : {}),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-history"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      setFocused(false);
    },
  });
  const clear = useMutation({
    mutationFn: () => api("search/history", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-history"] });
      queryClient.removeQueries({ queryKey: ["suggestions"] });
      setClearOpen(false);
    },
  });

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeading
        eyebrow="A world of perspectives"
        title="Follow your curiosity."
        description="Find useful context, reliable sources, and your next rabbit hole."
        icon={Globe02Icon}
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-5 sm:py-6">
          <CardTitle>Search the web</CardTitle>
          <CardDescription>Explore a question and read the original sources.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 py-5 sm:py-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setFocused(false);
              if (!user) onSignIn();
              else search.mutate();
            }}
          >
            <FieldGroup className="gap-3 sm:flex-row">
              <Field className="min-w-0 flex-1" data-disabled={search.isPending}>
                <FieldLabel className="sr-only" htmlFor="search-query">
                  Search query
                </FieldLabel>
                <Combobox
                  items={suggestions.data || []}
                  inputValue={query}
                  onInputValueChange={setQuery}
                  value={null}
                  onValueChange={(value) => {
                    if (value) setQuery(value);
                    setFocused(false);
                  }}
                  filter={null}
                  open={focused && !!suggestions.data?.length}
                  onOpenChange={setFocused}
                  disabled={search.isPending}
                >
                  <ComboboxInput
                    id="search-query"
                    aria-label="Search query"
                    placeholder="What would you like to explore?"
                    onFocus={() => setFocused(true)}
                    maxLength={400}
                    required
                    showTrigger={false}
                    showClear={false}
                    className="h-12"
                  >
                    <InputGroupAddon align="inline-start">
                      <Icon icon={Search01Icon} />
                    </InputGroupAddon>
                  </ComboboxInput>
                  <ComboboxContent>
                    <ComboboxList>
                      {(suggestion: string) => (
                        <ComboboxItem key={suggestion} value={suggestion}>
                          <Icon icon={Clock01Icon} />
                          {suggestion}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
              <Field className="w-auto justify-center">
                <Button type="submit" size="lg" disabled={!query.trim() || search.isPending}>
                  {search.isPending ? "Searching…" : "Explore"}
                  {!search.isPending && <Icon icon={ArrowRight01Icon} data-icon="inline-end" />}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          <div className="text-muted-foreground flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="inline-flex items-center gap-2">
                <Icon icon={Shield01Icon} />
                Safe search on
              </span>
              <label className="inline-flex items-center gap-2" htmlFor="search-freshness">
                Published
                <Select
                  items={freshnessOptions}
                  value={freshness || null}
                  onValueChange={(value) => setFreshness(value ?? "")}
                  disabled={search.isPending}
                >
                  <SelectTrigger id="search-freshness" size="sm" className="bg-background min-w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {freshnessOptions.map((option) => (
                        <SelectItem key={option.value || "any"} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <span>Powered by Brave Search</span>
          </div>

          {search.isError && (
            <ErrorNotice
              error={search.error}
              title="Search didn’t complete"
              onRetry={() => search.mutate()}
            />
          )}
        </CardContent>
      </Card>

      {search.isPending && (
        <section className="mt-8" aria-label="Search results loading">
          <LoadingRows count={2} />
        </section>
      )}

      {!search.isPending && search.data && (
        <section className="mt-8" aria-label="Search results">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6">
              <div className="flex flex-col gap-1.5">
                <CardTitle>Results for “{search.data.query}”</CardTitle>
                <CardDescription>
                  {search.data.sources.length}{" "}
                  {search.data.sources.length === 1 ? "source" : "sources"}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="py-5 sm:py-6">
              {search.data.sources.length ? (
                <Sources sources={search.data.sources} />
              ) : (
                <EmptyNotice
                  icon={Search01Icon}
                  title="No sources found this time"
                  description="Try a broader query or remove the date filter."
                  compact
                />
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mt-10 sm:mt-12">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-5 sm:flex-row sm:items-center sm:py-6">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Recent explorations</CardTitle>
              <CardDescription>Your saved web searches.</CardDescription>
            </div>
            {!!history.data?.length && (
              <CardAction className="mt-3 sm:mt-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => setClearOpen(true)}>
                  Clear history
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="py-5 sm:py-6">
            {!user ? (
              <EmptyNotice
                icon={Clock01Icon}
                title="A trail worth keeping"
                description="Sign in to search the web and keep your discoveries together."
                action={<Button onClick={onSignIn}>Sign in to explore</Button>}
                compact
              />
            ) : history.isPending ? (
              <LoadingRows count={2} />
            ) : history.isError ? (
              <ErrorNotice
                error={history.error}
                title="Your search history couldn’t load"
                onRetry={() => history.refetch()}
              />
            ) : history.data?.length ? (
              <ul className="flex flex-col divide-y">
                {history.data.slice(0, 10).map((item) => (
                  <li key={item.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start gap-3 rounded-none px-2 py-3 text-left"
                      onClick={() => {
                        setQuery(item.query);
                        search.reset();
                      }}
                    >
                      <Icon icon={Clock01Icon} />
                      <span className="min-w-0 flex-1 truncate">{item.query}</span>
                      <time className="text-muted-foreground shrink-0">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                      <Icon icon={ArrowUpRight01Icon} />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNotice
                icon={Globe02Icon}
                title="Your next discovery starts here"
                description="Your recent searches will appear here once you start exploring."
                compact
              />
            )}
          </CardContent>
        </Card>
      </section>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear your search history?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your saved searches. Your conversations will stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {clear.isError && <ErrorNotice error={clear.error} title="History couldn’t be cleared" />}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clear.isPending}>Keep history</AlertDialogCancel>
            <Button variant="destructive" onClick={() => clear.mutate()} disabled={clear.isPending}>
              {clear.isPending ? "Clearing…" : "Clear history"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
