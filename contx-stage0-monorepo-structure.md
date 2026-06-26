# Cont/x — Stage 0: Monorepo File Structure

npm workspaces monorepo. Two apps (`student-desktop`, `teacher-web`) + one shared package (`shared`). TypeScript everywhere. This is a starting point — every name and folder is revisable by the team.

```
contx/
├── package.json                     # Root workspace manifest — declares "workspaces": ["apps/*", "packages/*"]
├── package-lock.json                # Single lockfile for the whole monorepo (one node_modules tree)
├── tsconfig.base.json                # Shared TS compiler options every workspace extends from
├── .eslintrc.cjs                     # Shared lint rules across all workspaces
├── .prettierrc                       # Shared formatting rules
├── .gitignore                        # node_modules, dist, .env, etc.
└── README.md                         # Setup instructions + monorepo overview

apps/
├── student-desktop/                  # ELECTRON APP — exam-taking, lockdown, this is the active build target
│   ├── package.json                  # This app's deps/scripts; depends on packages/shared
│   ├── tsconfig.json                 # Extends tsconfig.base.json, adds Electron + DOM types
│   ├── electron.vite.config.ts       # electron-vite config — builds main, preload, and renderer together
│   ├── index.html                    # Renderer's HTML entry point (loaded into the Electron window)
│   │
│   └── src/
│       ├── main/                     # ELECTRON MAIN PROCESS — Node.js, system-level access, no UI
│       │   ├── index.ts               # App entry point — creates the BrowserWindow, handles app lifecycle (electron-vite's expected filename)
│       │   ├── windowManager.ts       # Creates/configures the kiosk-style window (no nav bar, fixed size)
│       │   │
│       │   ├── ipc/                  # IPC channel handlers — main-process side of renderer↔main messages
│       │   │   ├── ipcHandlers.ts     # Registers all ipcMain.handle listeners in one place
│       │   │   ├── examIpc.ts         # Main-process logic behind exam-related IPC channels
│       │   │   ├── lockdownIpc.ts     # Main-process side of lockdown events (internals out of scope here)
│       │   │   └── syncIpc.ts         # Bridges SQLite/Supabase sync status to the renderer
│       │   │
│       │   └── services/             # Main-process-only services — no UI, no React, never imported by renderer
│       │       ├── sqliteService.ts        # better-sqlite3 connection + queries (offline fallback)
│       │       ├── supabaseSyncService.ts  # Main-process Supabase calls (kept out of renderer)
│       │       └── examCompilerService.ts  # Shells out to local GCC (sandboxing internals out of scope)
│       │
│       ├── preload/                  # electron-vite convention — preload lives as its own sibling, not nested in main/
│       │   └── index.ts               # Secure bridge — exposes a narrow API to renderer via contextBridge
│       │
│       ├── renderer/                 # REACT APP — everything the student actually sees
│       │   ├── main.tsx               # React root — mounts <App /> into index.html
│       │   ├── App.tsx                # Top-level shell component
│       │   │
│       │   ├── router/
│       │   │   ├── routes.ts          # Defines "screens" as app-state values (no URL bar in kiosk mode)
│       │   │   └── AppRouter.tsx      # Renders whichever screen matches current app state
│       │   │
│       │   ├── screens/              # One folder per screen — top-level, page-like components
│       │   │   ├── Dashboard/
│       │   │   │   ├── DashboardScreen.tsx        # Renders the dashboard shell (extensible, content TBD)
│       │   │   │   └── DashboardScreen.types.ts    # Props/types specific to this screen
│       │   │   ├── ExamCodeVerification/
│       │   │   │   ├── ExamCodeVerificationModal.tsx
│       │   │   │   └── ExamCodeVerificationModal.types.ts
│       │   │   ├── Exam/
│       │   │   │   ├── ExamScreen.tsx              # Exam landing screen + "Start Exam" button
│       │   │   │   └── ExamScreen.types.ts
│       │   │   ├── MultipleChoice/
│       │   │   │   ├── MultipleChoiceScreen.tsx
│       │   │   │   └── MultipleChoiceScreen.types.ts
│       │   │   ├── FillInTheBlank/
│       │   │   │   ├── FillInTheBlankScreen.tsx
│       │   │   │   └── FillInTheBlankScreen.types.ts
│       │   │   └── Coding/
│       │   │       ├── CodingQuestionScreen.tsx    # Combines editor pane + problem pane + buttons
│       │   │       ├── CodingQuestionScreen.types.ts
│       │   │       ├── MonacoEditorPane.tsx        # Isolated wrapper around the Monaco editor
│       │   │       └── TestCasePanel.tsx           # Renders the visible sample test cases
│       │   │
│       │   ├── components/           # Small reusable UI pieces used across multiple screens
│       │   │   ├── common/
│       │   │   │   ├── Button.tsx
│       │   │   │   ├── Modal.tsx
│       │   │   │   └── Toast.tsx                   # Generic toast shell (violation toast builds on this)
│       │   │   └── indicators/                     # Cross-cutting UI states live here
│       │   │       ├── LockdownStatusIndicator.tsx  # Shows lockdown/session-active state
│       │   │       ├── SyncStatusIndicator.tsx      # Shows offline/local-SQLite-sync state
│       │   │       └── ViolationToast.tsx           # Shows the violation-logged notification
│       │   │
│       │   ├── stores/               # Zustand state — one store per concern (SRP)
│       │   │   ├── useExamSessionStore.ts   # Current exam/session state
│       │   │   ├── useAuthStore.ts          # Logged-in student info (placeholder — login screen skipped)
│       │   │   ├── useSyncStatusStore.ts    # Offline/sync indicator state
│       │   │   └── useViolationStore.ts     # Violation log/toast state
│       │   │
│       │   ├── hooks/                # Glue layer between components and stores/services
│       │   │   ├── useExamSession.ts        # DIP boundary — screens use this, never Supabase/SQLite directly
│       │   │   └── useIpcBridge.ts          # Typed wrapper around window.electronAPI calls
│       │   │
│       │   ├── contracts/            # SOLID Open/Closed — shared interfaces question screens implement
│       │   │   ├── QuestionScreenProps.ts   # Common contract every question-type screen must satisfy
│       │   │   └── QuestionType.ts          # Union/enum of question types (MCQ, FillBlank, Coding, ...)
│       │   │
│       │   ├── services/             # Renderer-side service layer — calls IPC, never Node/Supabase directly
│       │   │   ├── examService.ts           # Wraps IPC calls for exam actions
│       │   │   └── questionService.ts       # Wraps IPC calls for fetching/submitting question data
│       │   │
│       │   └── assets/
│       │       ├── icons/                    # SVG/PNG icons used in the UI
│       │       └── styles/
│       │           ├── global.css            # Base app-wide styles
│       │           └── theme.ts               # Design tokens (colors, spacing) if not using a CSS framework
│       │
│       └── types/
│           └── electron-api.d.ts      # Ambient type for the preload-exposed window.electronAPI shape
│
└── teacher-web/                      # REACT WEB APP — file structure only, not built yet
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── router/
        │   └── AppRouter.tsx          # Normal URL-based routing here (unlike desktop's state-based router)
        ├── screens/
        │   └── .gitkeep               # Placeholder — teacher screens are out of scope for now
        ├── components/
        │   └── .gitkeep
        ├── stores/
        │   └── .gitkeep
        └── services/
            └── .gitkeep

packages/
└── shared/                           # Shared TS package consumed by both apps
    ├── package.json                  # Workspace package manifest (e.g. name: "@contx/shared")
    ├── tsconfig.json
    └── src/
        ├── types/
        │   ├── examTypes.ts          # Shared Exam/Submission TS types
        │   ├── questionTypes.ts      # Shared question-type contracts both apps will eventually use
        │   └── violationTypes.ts     # Shared shape of a "violation" record
        ├── constants/
        │   └── examConstants.ts      # Shared constants (e.g. question type enum values)
        ├── ui/
        │   └── .gitkeep              # Placeholder — only add shared components once a real need appears
        └── index.ts                  # Single re-export point — apps import from "@contx/shared"
```

## Notes / open flags for the team

- **Build tooling decision (locked):** `apps/student-desktop` uses `electron-vite` to build the main, preload, and renderer code together with one config file (`electron.vite.config.ts`) instead of hand-rolling separate Vite + `tsc-watch` setups. This is why `main/`, `preload/`, and `renderer/` sit as siblings under `src/`, and why `main/index.ts` / `preload/index.ts` use `index.ts` rather than `main.ts` / `preload.ts` — that's electron-vite's expected default filename per process.
- **Installer & packaging config** (e.g. `electron-builder.json` / Electron Forge config) is intentionally left out of this structure since Stage 1 of the build order skips the Installer screen. We'll add it when that's back in scope — flagging now so nobody assumes it's missing by accident.
- **`packages/shared/src/ui/`** is a placeholder. Per the "narrow interfaces" principle, we won't put anything in there until both apps actually need the same component — premature sharing tends to create awkward, overly-generic components.
- **`contracts/`** in the desktop app is where the Open/Closed + Liskov work for question screens will live — MCQ, Fill-in-the-Blank, and Coding all implement `QuestionScreenProps`/`QuestionType`, so adding a new question type later won't touch existing question components.
- Folder/file names here are a first draft — easy to rename in Stage 1 if either of you wants something different before we start scaffolding.
