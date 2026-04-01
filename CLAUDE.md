# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

##
Only work on gap-evals repo. Do not touch any other repo.
Only edit GAP Evals project. Do not touch any other projects.

## Build & Dev Commands

- `npm run dev` — Start dev server (Next.js, port 3000)
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- No test runner is configured

## Dev Server

Never start a dev server yourself; the user should start a dev server if needed.

## Development Workflow

Whenever possible, try not to implement the changes yourself. Depending on the complexity of the change, kick off several coding-agents to run in the background and, if possible, in parallel.

After completing a change or a feature, always kick off one to three code-reviewer agents to ensure that the code is of high quality.

# currentDate
Today's date is 2026-04-01.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Firebase (Firestore & Auth) + Tailwind CSS v4 + shadcn/ui

**What this app does:** Employee evaluation system for GoAbroad.com. Admins create evaluation periods, assign evaluators to evaluatees, and review aggregated results. Users complete assigned evaluations.

### Data Layer

All data is client-side Firestore — no REST API, no server actions, no ORM. Direct Firestore SDK calls (`getDocs`, `addDoc`, `updateDoc`, `deleteDoc`, `onSnapshot`) throughout components and hooks.

**Firestore collections:**
- `users/{uid}` — profiles (auto-created on first Google OAuth login)
- `roles/{id}` — role definitions with `isAdmin`, `canManageTeam` flags
- `periods/{id}` — evaluation periods; subcollections: `questions`, `assignments`, `responses`
- `question_presets/{id}` — reusable question templates
- `departments/{id}` — department catalog

### State Management

Context-based (no Redux). Key providers chained in root layout:
- `AuthProvider` (`lib/auth-context.tsx`) — user, role, isAdmin, canManageTeam via Firebase Auth + Firestore role lookup
- `SettingsProvider` (`lib/settings-context.tsx`) — UI preferences (density, font size)
- `ThemeProvider` — dark/light mode via `next-themes`

### Auth

Google OAuth via `signInWithPopup`. New users auto-provisioned with default "Member" role. Role-based access (`isAdmin`, `canManageTeam`) controls sidebar nav and route visibility in `app/dashboard/layout.tsx`.

### Path Aliases

`@/*` maps to project root (e.g., `@/components/ui/Button`, `@/lib/utils`, `@/hooks/useQuestions`).

### UI

- shadcn/ui components in `components/ui/` (configured via `components.json`, style: "base-nova")
- OKLCh color system with cobalt palette defined as CSS variables in `app/globals.css`
- Animations via Framer Motion
- Icons via Lucide React
- Font: Plus Jakarta Sans
