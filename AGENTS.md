<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## EchoGPT frontend

This is a Next.js App Router frontend for the EchoGPT NestJS REST API. Use the existing template and package manager (Bun).

### Design source of truth

- Read `DESIGN.md` before changing the UI. Its colors, type scale, radius scale, surface treatments, and restrictions take precedence over generic design-skill defaults.
- Keep the EchoGPT product name. The Expo reference defines visual cues, not product identity or functionality: this is a working chat workspace, not a marketing site.
- Use Inter for display and body text (display weight 600, body 400, buttons 500). Use JetBrains Mono for code only.
- Keep body and chat copy around 16px, controls and navigation around 14px, and supporting copy at least 13px. Adapt display headings to a working chat interface.
- Support Light, Dark, and System appearance. New visitors default to Light; preserve a user's stored choice. The white light palette uses #171717 ink and #60646c body text. Derive Dark from #171717 surfaces with white buttons for contrast, using the same semantic token system.
- Use black (#000000) primary actions in Light and white primary actions in Dark. Keep the EchoGPT mark and wordmark monochrome. Blue is for inline prose links only, never UI calls to action. Use accent colors only for genuine activity states.
- Use 8px buttons and inputs; buttons are not pills. Use 12px cards and dialogs. Pills are for badges only. Keep surfaces flat except for the subtle `0 4px 12px rgba(0,0,0,.04)` hover shadow on prompt and source cards. Use the subtle sky-blue radial wash only behind the home hero.
- Do not use #999 muted text or #eb8e90 semantic error as essential light-theme text when contrast is insufficient; use #60646c body and a deeper error color instead.
- Treat the home screen as a real working composer surface. Do not add marketing device mockups to the chat workspace.
- Keep one workspace collapse control in the workspace header. On mobile, the sheet has its close control inside the sheet only.
- Make selected controls visibly distinct. Web search uses a semantic green fill, stronger text weight, helper copy, and `aria-pressed`; selected prompt categories use an accent surface and outline. Do not rely on color alone.
- Do not add shadows beyond the documented card-hover tier, fabricated activity, placeholder user history, fake usage counts, or unsupported product features.

### Skills and UI implementation

- Read `.agents/skills/shadcn/SKILL.md` and its applicable references before adding or composing UI. Check the current project context and official component documentation through the shadcn CLI.
- Apply `.agents/skills/redesign-existing-projects/SKILL.md` to audit and improve the existing application without losing functionality.
- Apply relevant polish from `.agents/skills/high-end-visual-design/SKILL.md` only where it agrees with `DESIGN.md` and a practical chat workspace.
- `design-taste-frontend` targets marketing pages and explicitly excludes dashboards and multi-step product UI. Do not force its landing-page patterns onto this application.
- Use Tailwind v4 utilities for layout and spacing. Use semantic shadcn color tokens, configured in `src/app/globals.css`, rather than per-component hex values or manual dark-color overrides.
- Prefer installed shadcn components and built-in variants. Use their form, sidebar, dialog, input-group, feedback, table, and chat primitives instead of recreating those controls in custom CSS.
- Keep generated shadcn component sources unchanged so they remain easy to update. Put brand tokens, type recipes, layout classes, and app-specific compositions in the theme or wrapper components.
- A minimal compatibility repair is allowed when a generated component cannot compile against the installed dependencies. Document such repairs in the README; do not mix them with component restyling.
- Use the project's Base UI composition (`render`, not Radix `asChild`) and Hugeicons icon family. Pass icon objects directly and let components size their icons.
- Keep custom CSS limited to theme tokens, documented type utilities, and small effects that Tailwind cannot express cleanly. Avoid separate application-wide styling systems.
- Use standard responsive breakpoints, visible focus states, accessible labels, reduced-motion support, and no horizontal page overflow at phone widths.

### API and state

- Preserve the existing server proxy, HttpOnly session cookies, refresh-token rotation, and role checks. Never put tokens or provider credentials in client storage.
- Keep TanStack Query for server state and Zustand for workspace navigation. Clear account-specific caches when the session ends or the account changes.
- Match the actual backend endpoints and DTOs. Provider selection is deferred; new conversations use the backend's configured default provider.
- Provider management lives in Administration. New providers start disabled; editing cannot change type, and a blank replacement key preserves the saved key. Never retain provider API keys in query/mutation caches, browser storage, or fixtures. Health checks send a real, potentially billable AI request and require explicit confirmation; do not run them automatically during verification.
- Do not modify the backend, database, or migrations unless the user requests it.
- Clearly distinguish isolated test fixtures from real API responses. Do not leave the development preview connected to a fixture when handing it back.

### Verification and handoff

- Run `bun run lint`, `bun run typecheck`, `bun run test`, `bun run fmt:check`, and `bun run build` after material implementation changes.
- Verify the main flows and both themes in a browser. Check phone and desktop layouts, keyboard interaction, errors, loading states, and session behavior.
- Update the README when setup, commands, or supported behavior changes.
- Preserve existing user changes. Do not commit, push, or deploy unless requested.
