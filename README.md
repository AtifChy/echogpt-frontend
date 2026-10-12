# EchoGPT frontend

A quiet workspace for AI conversations and web search, built on the existing Next.js template. The visual language follows `DESIGN.md`; the composer flow takes inspiration from the [Manus composer teardown](https://aiuxplayground.com/teardowns/manus/composer).

## Getting started

You need Bun, Node.js compatible with your installed Next.js version, and the EchoGPT NestJS backend.

1. Install dependencies:

   ```bash
   bun install
   ```

2. Copy `.env.example` to `.env.local`. The default backend address is:

   ```env
   BACKEND_API_URL=http://localhost:3010/api/v1
   ```

3. Start PostgreSQL and the NestJS backend using the backend repository’s README. Before sending chat messages, sign in as an admin and use **Administration → AI providers** to add a provider, enable it, and make it the default. Web search also needs a valid Brave Search API key in the backend.

4. Start the frontend:

   ```bash
   bun run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). Create an account or sign in with an existing backend account.

The frontend uses port **3000** and connects to your backend on **3010**. API requests go through a Next.js server route; you do not need to change the backend’s browser CORS configuration for this frontend.

## What you can do

- Register, sign in, and sign out.
- Start a conversation using the backend’s default AI provider.
- Send prompts, read responses, revisit conversations, and delete them.
- Turn on web search in the composer to receive answers with sources.
- Search the web directly, filter by freshness, and revisit or clear search history.
- Browse prompt starters for writing, research, coding, and everyday ideas.
- Choose Light, Dark, or System appearance from the header menu. Light is the default for new visitors, and a saved choice is remembered.
- Update your display name, change your password, or delete your account.
- See your request usage, remaining quota, and reset date.
- As an admin, view dashboard totals, system health, users, plans, and request logs; activate or suspend users and update plans.
- As an admin, add and edit OpenAI, Claude, or Gemini providers, replace API keys, enable or disable providers, choose the default, and delete non-default providers. Health checks ask for confirmation before making a real, potentially billable AI request.

The home screen can be explored without signing in. Sending prompts and searching the web require an account. No simulated AI responses or fake usage counts are displayed.

## Authentication and API connection

`src/app/api/backend/[...path]/route.ts` forwards a defined set of routes to NestJS. The server stores access and refresh tokens in HttpOnly, SameSite cookies, and sends the access token to NestJS as a bearer token. Tokens are never returned to client JavaScript or stored in local storage. Cookies use the Secure flag in production, so deploy the frontend over HTTPS.

The browser API client retries protected requests after one refresh rotation when the access token expires. Concurrent queries share that rotation. Logout, account deletion, and successful password changes clear the frontend cookies. NestJS remains responsible for authentication, role checks, validation, and session revocation.

`BACKEND_API_URL` is a server-only setting. Do not put provider API keys, database credentials, or JWT signing secrets in the frontend.

## Current scope

- **Per-chat provider selection is deferred.** New conversations use the enabled default provider configured in Administration. Existing conversations retain their provider. New providers start disabled; enable one before selecting **Make default**. Provider types cannot be changed after creation, and blank API keys in the edit form preserve the saved key.
- Conversation titles are derived from prompts during the current browser session. After reload, conversations may use their numeric IDs because the backend has no title field.
- Chat sources use compact numbered links, expandable into a full source list. The frontend prefers saved `message.sources` returned by conversation history. The current backend does not yet persist citations; follow `docs/persist-chat-sources.md` in the backend repository to enable that. Citations never stored for older messages cannot be recovered automatically.
- Responses arrive as complete messages. The backend does not currently offer streaming.
- A conversation can display previous messages, but the current backend sends only the latest prompt to the AI provider. Multi-turn context needs a backend change.
- Plan changes are managed by admins. There is no payment or self-service checkout.
- File uploads, voice input, cloud connectors, and autonomous tasks are not implemented in the backend and are not shown as working frontend features.

## Design and components

The visual source of truth is `DESIGN.md`. Layouts use Tailwind v4; controls, forms, navigation, messages, and feedback use the existing shadcn Base UI setup with Hugeicons. `src/app/globals.css` holds the semantic theme tokens and type recipes. App-specific compositions live outside `src/components/ui/`.

- Inter is used at weight 600 for headings, 400 for body text, and 500 for buttons; JetBrains Mono is reserved for code. The home surface is a real working composer, not a marketing device mockup.
- Light is the default for new visitors: white canvas, #171717 ink, #60646c body text, and black primary buttons. Dark derives from #171717 surfaces and uses white buttons for contrast. Light, Dark, and System are supported, and stored choices are preserved.
- Buttons and inputs use 8px corners; cards and dialogs use 12px corners. Buttons are not pills (badges may be). Surfaces stay flat except for the subtle `0 4px 12px rgba(0,0,0,.04)` hover shadow on prompt and source cards. A subtle sky-blue radial wash appears only behind the home hero.
- The EchoGPT mark and wordmark are monochrome. Blue is reserved for inline prose links, not UI calls to action; accent colors are reserved for genuine activity states. Avoid #999 muted and #eb8e90 error as essential light-theme text when contrast is insufficient; use #60646c body text and a deeper error color.
- The workspace header has one collapse control. On mobile, the sheet's close control appears inside the sheet.
- The web-search toggle uses a green selected state and stronger text weight. The helper line shows when search is on, and `aria-pressed` exposes its state to assistive technology. Color communicates state rather than changing the primary button palette.
- Answers use `react-markdown` with GitHub-flavored Markdown for lists, tables, links, and code. Raw HTML and remote images are disabled, and links are restricted to HTTP(S) or local fragment references.
- Generated shadcn component sources remain unchanged except a minimal Spinner prop-typing correction for the installed Hugeicons definitions. Formatting skips generated UI files to keep upstream updates simple. The mobile hook uses React’s external-store API to satisfy the current React lint rule.

## Commands

```bash
bun run dev        # Development server on port 3000
bun run lint       # ESLint
bun run typecheck  # TypeScript checks
bun run test       # API client and server-proxy tests; no database needed
bun run fmt        # Format files
bun run fmt:check  # Check formatting
bun run build     # Production build
bun run start      # Serve the production build on port 3000
```

To use a different port, append `--port <number>` to `bun run dev` or `bun run start`.

The tests use mocked HTTP responses and static React rendering. They cover cookie handling, token refresh, request restrictions, provider routes and form validation, Markdown/source rendering safety, and session clearing. They do not call paid AI APIs or change your database.

## Project structure

```text
src/
├── app/
│   ├── api/backend/[...path]/route.ts  NestJS proxy entry point
│   ├── globals.css                    Tailwind, design tokens, and both themes
│   ├── layout.tsx                     Fonts, metadata, and query provider
│   └── page.tsx                       Workspace entry point
├── components/
│   ├── workspace.tsx                  Navigation and conversations
│   ├── app-sidebar.tsx                shadcn navigation and conversation list
│   ├── home-workspace.tsx             Home composer and prompt starters
│   ├── composer.tsx                   Prompt input and web-search toggle
│   ├── messages.tsx                   Safe message rendering and sources
│   ├── markdown-answer.tsx            Safe Markdown answer rendering
│   ├── sources.tsx                    Compact chat citations and search cards
│   ├── auth-dialog.tsx                Registration and login
│   ├── account-dialog.tsx             Profile, security, and usage
│   ├── search-workspace.tsx           Web search and history
│   ├── prompt-library.tsx             Prompt starters
│   ├── admin-workspace.tsx            Admin dashboard and management
│   ├── provider-management.tsx        Admin provider list and actions
│   ├── provider-dialog.tsx            Add/edit provider form
│   ├── app-modal.tsx                  App-level dialog composition
│   ├── confirm-dialog.tsx             Destructive action confirmation
│   ├── feedback.tsx                   Error, empty, and loading states
│   └── ui/                            Generated shadcn primitives
└── lib/
    ├── api.ts                         Browser API client and refresh handling
    ├── backend-proxy.ts               Cookie and upstream request handling
    ├── prompts.ts                     Prompt starter content
    ├── providers.ts                   Provider choices and form validation
    ├── types.ts                       API response types
    └── workspace-store.ts             UI navigation state
test/                                  API and authentication boundary tests
```

## Troubleshooting

**Cannot reach EchoGPT:** Check that the NestJS server is running and `BACKEND_API_URL` points to its `/api/v1` prefix. Restart Next.js after changing `.env.local`.

**No default provider configured:** Sign in as an admin, open **Administration → AI providers**, add a provider with a valid API key, choose **Enable**, then **Make default**. The backend Swagger UI remains an alternative.

**Web search fails:** Check the backend’s Brave Search API key and quota. The frontend shows the error returned by the backend.

**Password changed:** All backend sessions are revoked. Sign in again using the new password.
