# Architecture

A guide to where things live and how a request moves through the code. Read
this before your first change; the [README](README.md) covers setup.

## The big picture

```
Browser (React)  ──HTTP──▶  FastAPI backend  ──▶  MySQL   (users, chats, messages, documents)
                                            ──▶  Qdrant  (brochure text chunks + embeddings)
                                            ──▶  Gemini  (embeddings, answers, chat titles)
```

A user uploads brochure PDFs. The backend splits each PDF into chunks,
embeds them with Gemini and stores them in Qdrant. When the user asks a
question, the backend finds the chunks most relevant to it (from the
brochures attached to that chat only) and asks Gemini to answer from them.

## Backend: `backend/src/app/`

The backend is split into layers. Each layer only calls the layers below it:

```
routes/    HTTP: parse the request, check login, call a service, shape the response
   │
services/  business rules: "a chat holds at most 5 brochures", "only the owner may delete"
   │
   ├── db/    SQLAlchemy models and the database session
   └── rag/   PDF → chunks → Qdrant, and question → chunks → Gemini answer
```

| Folder / file | What goes here |
|---|---|
| `main.py` | Creates the FastAPI app, registers routers and error handlers. Rarely changes. |
| `core/config.py` | Every setting and tunable number (models, chunk size, limits). Read env vars here and nowhere else. |
| `core/errors.py` | `DomainError` and subclasses. Services raise these; `main.py` turns them into HTTP responses. |
| `routes/<resource>.py` | One `APIRouter` per URL prefix (`/auth`, `/chats`, `/documents`). Keep these thin. |
| `routes/deps.py` | Shared FastAPI dependencies such as `get_current_user`. |
| `schemas/<resource>.py` | Pydantic request/response bodies, named after the router that uses them. |
| `services/<resource>.py` | The actual logic. Takes a db session and plain values; knows nothing about HTTP. |
| `db/models.py` | Database tables. After changing it, add an Alembic migration (see below). |
| `rag/indexing.py` | Loading PDFs, chunking, embedding, writing to and deleting from Qdrant. |
| `rag/retrieval.py` | Searching Qdrant and the prompt + LLM chain that writes answers. |

Outside `app/`:

- `src/alembic/versions/` holds database migrations, numbered `0001_…`, `0002_…`.
- `src/scripts/` holds one-off commands (`python -m scripts.init_db`).
- `evals/` holds offline quality checks for the RAG pipeline (see `evals/README.md`).
  They import from `app.core` and `app.rag`, so keep those importable without a database.

### Following a request: asking a question

1. The frontend POSTs to `/chats/{id}/messages/stream`.
2. `routes/chats.py: stream_message` gets the logged-in user from
   `routes/deps.py: get_current_user`, loads the chat and validates the body
   with `schemas/chats.py: SendMessageRequest`.
3. It calls `services/chats.py`: `ensure_can_answer` (does the chat have
   brochures?), `save_question`, then `stream_answer` inside the streaming response.
4. `stream_answer` uses `rag/retrieval.py: build_retrieval_chain` to search
   only that chat's brochures and stream Gemini's answer.
5. The route sends a `{"type": "start"}` line with the saved question, each token
   as a line of JSON (`{"type": "token"}`), then a final `{"type": "done"}` with
   the saved messages.

Retrying (`/chats/{id}/messages/retry/stream`) deletes everything after the
chosen question and streams a new answer the same way. Stopping a response
just aborts the request: the stream is cancelled and nothing more is saved, so
the question stays unanswered.

### Errors

Inside a service, raise one of the errors from `core/errors.py`
(`NotFoundError`, `ConflictError`, …) with a message a user can read. Don't
raise `HTTPException` from services. The handler in `main.py` turns these
errors into the right status code.

## Frontend: `frontend/src/`

```
main.jsx        routes: which URL shows which page
pages/          one file per route; composes components and hooks
components/     UI pieces, grouped by the area of the screen they belong to
hooks/          state + data loading (useChat, useChatDocuments, useAuth, useTheme)
api/            every call to the backend; nothing else uses fetch
utils/          small pure helpers (formatting, validation, file checks)
constants/      config values and fixed text
```

| Folder | Contents |
|---|---|
| `pages/` | `LandingPage`, `LoginPage`, `SignupPage`, `ChatPage` (the main app at `/app`). |
| `components/auth/` | Login state (`AuthProvider`) and route guards. |
| `components/chat/` | Everything in the main chat column: header, brochure bar and picker, messages, input. |
| `components/sidebar/` | The chat list: `Sidebar`, `ChatRow`, `ChatRowMenu`. |
| `components/settings/` | `SettingsDialog` plus one file per tab (`ProfileSection`, `PasswordSection`, …). |
| `components/common/` | Reused anywhere: `FormField`, `SubmitButton`, `ConfirmDialog`, `Logo`, `ThemeToggle`. |
| `api/client.js` | Base URL, login token, retries, error messages, streaming. |
| `api/auth.js`, `api/chats.js`, `api/documents.js` | One small function per backend endpoint. |

Data flows one way: **page → hook → api → backend**. Components get data and
callbacks through props and don't call `api/` directly. The exceptions are
`AuthProvider` (it owns the login state), the library search in
`BrochurePicker`, and the settings tabs, which load their own data.

## Where do I put…?

| I want to… | Change |
|---|---|
| Add a backend endpoint | Request/response model in `schemas/<resource>.py`, logic in `services/<resource>.py`, route in `routes/<resource>.py`. For a new resource, also `app.include_router(...)` in `main.py`. |
| Add a database column | `db/models.py`, then `python -m alembic revision -m "what changed"` from `backend/src` and fill in the generated file under `alembic/versions/`. |
| Change chunking, models or limits | `core/config.py` (and `constants/config.js` if the UI shows the same limit, e.g. `MAX_PDFS`). |
| Change how answers are written | The prompt in `rag/retrieval.py`. Run the generator eval afterwards. |
| Call a new endpoint from the UI | Add a function to the matching `api/*.js` file, then use it from a hook. |
| Add a page | A file in `pages/` and a `<Route>` in `main.jsx`. |
| Add a settings tab | A `components/settings/<Name>Section.jsx` wrapped in `SettingsSection`, then add it to `SECTIONS` in `SettingsDialog.jsx`. |
| Add a reusable UI piece | `components/common/`. |

## Conventions

- **Naming.** Python files are `snake_case.py`. React components are `PascalCase.jsx`
  with a named export matching the file name. Hooks start with `use`.
  Frontend API functions end in `Api` (`fetchChatsApi`).
- **One job per file.** If a file grows past ~250 lines or does two things,
  split it, as was done for `components/settings/`.
- **Comments say why, not what.** The code shows what it does; a comment is for
  the reason that isn't obvious (a workaround, a limit, a trade-off).
- **Limits live in config.** `MAX_PDFS`, file size and the like are defined once
  per side (`core/config.py`, `constants/config.js`); keep the two in sync.
- **Before you push:** `npm run lint` and `npm run build` in `frontend/`, and
  start the API once (`python -m uvicorn app.main:app`) to check it imports.
