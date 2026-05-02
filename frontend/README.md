# VerifyAI Frontend

React + Vite single-page app for the VerifyAI fake news detection platform. Talks to the [Django backend](../backend/README.md) via JWT-authenticated REST.

## Tech Stack

- **React 19** + **React Router v7**
- **Vite 8** (dev server with HMR + dev proxy to the backend)
- **Tailwind CSS 3**
- **Recharts** for analytics charts
- **Axios** for HTTP (JWT interceptors in [src/services/api.js](src/services/api.js))
- **Lucide React** icons

## Run with Docker (Recommended)

The frontend ships with a [Dockerfile](Dockerfile) and a [docker-compose.yml](docker-compose.yml) that runs the Vite dev server in a container with HMR.

### Frontend only

```bash
docker compose up --build
```

| Service | Container | Host port |
|---------|-----------|-----------|
| `frontend` | `verifyai-frontend` | `5174` (mapped to container `5173`) |

Open **http://localhost:5174**. The container expects the backend to be reachable at `http://backend:8000` (set via `VITE_API_TARGET`), so the frontend container must share a Docker network with the backend container — easiest way is to start the whole stack from the project root.

### Full stack (frontend + backend + DB + Redis + Celery)

From the **project root**:

```bash
docker compose up --build
```

The root [docker-compose.yml](../docker-compose.yml) includes both the backend and frontend compose files. See the [root README](../README.md#run-with-docker-recommended) for full details on services, ports, and volumes.

### Useful commands

```bash
# Background mode
docker compose up -d --build

# Tail logs
docker compose logs -f frontend

# Open a shell inside the container
docker compose exec frontend sh

# Install a new npm package (re-runs in container)
docker compose exec frontend npm install <pkg>

# Stop everything
docker compose down
```

### Notes

- The container bind-mounts the project directory but keeps `node_modules` in a named volume (`frontend_node_modules`) so the host's OS-specific binaries don't clobber the Linux ones inside the container.
- `VITE_API_TARGET` defaults to `http://backend:8000` inside Docker and `http://localhost:8000` for local `npm run dev`.

---

## Manual Setup (without Docker)

### Prerequisites

- Node.js 18+
- A running [VerifyAI backend](../backend/README.md) at `http://localhost:8000` (or set `VITE_API_TARGET`)

### Install & run

```bash
npm install
npm run dev
```

The app will be available at **http://localhost:5173**. API calls to `/api/*` are proxied to the backend via [vite.config.js](vite.config.js).

### Available scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint over the codebase |

### Configure backend URL

By default the dev proxy points at `http://localhost:8000`. To change it:

```bash
# Linux/Mac
VITE_API_TARGET=http://localhost:8001 npm run dev

# Windows (PowerShell)
$env:VITE_API_TARGET="http://localhost:8001"; npm run dev
```

## Project Structure

```
src/
├── components/     # Shared UI: Navbar, DashboardLayout
├── contexts/       # AuthContext (JWT state)
├── pages/          # Route components
│   └── admin/      # Admin-only pages (system health, ML, datasets, users)
├── services/
│   └── api.js      # Axios instance, JWT interceptors, all API modules
├── App.jsx         # Router setup
└── main.jsx        # Entry point
```
