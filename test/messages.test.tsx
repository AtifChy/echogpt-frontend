import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { MarkdownAnswer } from "../src/components/markdown-answer";
import { Sources } from "../src/components/sources";
import { sourceLinks, safeSourceUrl } from "../src/lib/sources";
import type { Source } from "../src/lib/types";

const sampleSources: Source[] = Array.from({ length: 5 }, (_, index) => ({
  citation: index + 1,
  title: `Fixture source ${index + 1}`,
  url: `https://source-${index + 1}.example.invalid/path`,
  hostname: "untrusted.example",
  snippets: [`Isolated source snippet ${index + 1}.`],
}));

describe("message rendering", () => {
  test("renders mixed prose and wrapped or indented unordered lists as list elements", () => {
    const html = renderToStaticMarkup(
      <MarkdownAnswer
        content={[
          "A short introduction with useful context.",
          "",
          "* First item that wraps",
          "  across a second source line.",
          "* Second item",
          "",
          "  * Nested indented item",
        ].join("\n")}
      />,
    );
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
    expect(html).toContain("First item that wraps");
    expect(html).toContain("across a second source line.");
    expect(html).not.toContain("* First item");
  });

  test("renders ordered lists, bold text, inline code, fenced code, and GFM tables", () => {
    const html = renderToStaticMarkup(
      <MarkdownAnswer
        content={[
          "1. First step",
          "2. Second step",
          "",
          "Use **bold** and `inline()` here.",
          "",
          "```typescript",
          "const answer = 42;",
          "```",
          "",
          "| Name | Value |",
          "| --- | ---: |",
          "| answer | 42 |",
        ].join("\n")}
      />,
    );
    expect(html).toContain("<ol>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>inline()</code>");
    expect(html).toContain("<pre");
    expect(html).toContain("language-typescript");
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });

  test("ignores raw HTML and scripts, blocks unsafe links, and omits images", () => {
    const html = renderToStaticMarkup(
      <MarkdownAnswer
        content={[
          "<script>alert('xss')</script>",
          "[javascript](javascript:alert%281%29)",
          "[data](data:text/html,unsafe)",
          "![remote image](https://remote.example.invalid/image.png)",
          "[safe](https://safe.example.invalid/path)",
        ].join("\n\n")}
      />,
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("remote.example.invalid");
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="data:');
    expect(html).toContain('href="https://safe.example.invalid/path"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

describe("source links", () => {
  test("accepts only HTTP URLs and derives hostname from the URL", () => {
    expect(safeSourceUrl("https://www.real.example/path")).toBe("https://www.real.example/path");
    expect(safeSourceUrl("mailto:test@example.invalid")).toBeNull();
    expect(safeSourceUrl("javascript:alert(1)")).toBeNull();
    expect(safeSourceUrl("data:text/plain,unsafe")).toBeNull();
    const links = sourceLinks([
      { ...sampleSources[0], hostname: "untrusted.example" },
      { ...sampleSources[1], url: "javascript:alert(1)" },
      { ...sampleSources[2], url: "data:text/html,unsafe" },
      { ...sampleSources[3], url: "mailto:test@example.invalid" },
    ]);
    expect(links).toHaveLength(1);
    expect(links[0].domain).toBe("source-1.example.invalid");
    expect(links[0].domain).not.toBe("untrusted.example");
  });

  test("compact mode starts with three preview links and a collapsed all-sources container", () => {
    const html = renderToStaticMarkup(<Sources sources={sampleSources} compact />);
    const detailsMarker = html.indexOf('hidden=""');
    const previewMarkup = detailsMarker < 0 ? html : html.slice(0, detailsMarker);
    expect(
      (previewMarkup.match(/href="https:\/\/source-\d+\.example\.invalid/g) ?? []).length,
    ).toBe(3);
    expect(html).toContain("View all sources");
    expect(html).toContain('aria-expanded="false"');
    const hiddenDetails = html.match(/<div id="([^"]+)" hidden="">/);
    expect(hiddenDetails).not.toBeNull();
    expect(html).toContain(`aria-controls="${hiddenDetails?.[1]}"`);
    expect(html).toContain("Fixture source 5");
  });

  test("direct search mode renders all source titles", () => {
    const html = renderToStaticMarkup(<Sources sources={sampleSources} />);
    for (const source of sampleSources) expect(html).toContain(source.title);
  });
});
