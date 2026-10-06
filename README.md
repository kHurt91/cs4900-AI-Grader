# AI Grader

AI Grader is a two-service web app for delivering and AI-grading symbolic math quizzes, built for Western Michigan University CS 4900.

- **frontend**: React, TypeScript, Vite, and Tailwind
- **backend**: Django REST Framework, PostgreSQL or SQLite, and Anthropic Claude-assisted grading
- **deployment**: Railway monorepo with a public frontend service, private backend service, and managed Postgres database

## App Structure

```text
.
|-- frontend/   React quiz delivery UI
`-- backend/    Django API, auth, quizzes, assignments, and grading
```

The frontend calls `/api/...` on the same origin. In local development, Vite proxies those requests to the Django server at <http://localhost:8000>. In Railway, nginx serves the built frontend and proxies `/api/` to the private backend service.

## Prerequisites

- Node.js and npm
- Python 3 with `venv`
- An Anthropic API key for AI-assisted grading

## Running Locally

Create your local environment file:

```sh
cp .env.example .env
```

Fill in at least:

```env
SECRET_KEY=your-django-secret-key
ANTHROPIC_API_KEY=...
```

Set up the backend:

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mkdir -p data
python manage.py migrate
python manage.py runserver
```

In another terminal, set up the frontend:

```sh
cd frontend
npm install
npm start
```

Open the Vite URL printed by `npm start`. API requests from the frontend will be proxied to <http://localhost:8000>.

## Environment Variables

### Local

| Variable | Required | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | Yes | Django signing key. Use any development-only secret locally. |
| `ANTHROPIC_API_KEY` | Yes for AI grading | Enables Claude-backed grading paths. |
| `DATABASE_URL` | No | Optional database override. If omitted, Django uses `backend/data/db.sqlite3`. |

### Railway

Backend service variables:

| Variable | Value |
| --- | --- |
| `PORT` | `8000` |
| `DEBUG` | `False` |
| `SECRET_KEY` | Generated production secret |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `FRONTEND_URL` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `ALLOWED_HOSTS` | `${{frontend.RAILWAY_PUBLIC_DOMAIN}},${{backend.RAILWAY_PRIVATE_DOMAIN}},healthcheck.railway.app` |

Frontend service variables:

| Variable | Value |
| --- | --- |
| `BACKEND_URL` | `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}` |

Do not set `VITE_API_BASE_URL` in Railway. The frontend intentionally calls `/api/...` on the same origin, and nginx forwards those requests to the private backend.
Keep `PORT=8000` as an explicit backend service variable because Railway reference variables do not expose the runtime-injected port automatically.
When generating the public domain for the frontend service, use target port `8080`.

## Common Developer Commands

Frontend:

```sh
cd frontend
npm start          # run Vite dev server
npm run build      # create production build
npm run sync-types # regenerate API schema and TypeScript types
```

Backend:

```sh
cd backend
source .venv/bin/activate
python manage.py migrate
python manage.py runserver
python manage.py test
```

## API Type Generation

Frontend TypeScript types are generated from the Django REST Framework OpenAPI schema:

1. `drf-spectacular` writes `backend/schema.yaml` from serializers and `@extend_schema` decorators.
2. `openapi-typescript` converts the schema into `frontend/src/api/schema.d.ts`.
3. `openapi-fetch` provides the typed frontend API client.

When a serializer or API endpoint changes, regenerate the frontend types:

```sh
cd frontend
npm run sync-types
```

For standard `ModelViewSet` CRUD actions, `drf-spectacular` detects the serializer automatically. For custom `@action` endpoints, add an `@extend_schema` decorator with the request and response shapes so the generated schema stays accurate.

Interactive API docs are available at <http://localhost:8000/api/docs/> when the backend is running.

## Deploying to Railway

Railway deployment uses three services in one project:

| Service | Visibility | Root Directory | Config File |
| --- | --- | --- | --- |
| `frontend` | Public | `/frontend` | `/frontend/railway.toml` |
| `backend` | Private | `/backend` | `/backend/railway.toml` |
| `Postgres` | Managed database | n/a | n/a |

Browser requests should all use the frontend domain. Do not expose the backend publicly unless there is a separate reason to.

### Deploy

1. Create the `frontend`, `backend`, and `Postgres` services in one Railway project.
2. Connect both app services to this GitHub repo.
3. Set each service root directory and Railway config file as shown above.
4. Add the backend and frontend variables from the Railway environment tables.
5. Generate a Railway public domain for `frontend` only.
6. Deploy `backend`, then deploy `frontend`.

`docker-compose.yml` is not used for Railway deployment.

### Verify

After deployment:

1. Open `https://<frontend-domain>/health` and confirm it returns `ok`.
2. Open `https://<frontend-domain>/api/schema/` and confirm the API schema loads through the frontend proxy.
3. Test register/login.
4. Confirm refresh-backed navigation still works after reloading authenticated pages.

## Architecture Notes

```text
Browser
  -> Railway frontend domain
       -> nginx
            |-- /api/* -> backend private Railway service
            `-- /*     -> React static files
```

For backend-specific grading behavior, problem templates, assignment flow, and API reference notes, see [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md).
