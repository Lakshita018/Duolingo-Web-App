# Deploying

There are two ways to deploy:

- **Option A: Vercel (frontend) + Render (backend)**, described first.
- **Option B: a single VPS**, described after it.

## Option A: Vercel + Render

### Important limitation of Render's free tier

The free tier has no persistent disk, so the SQLite database is wiped on every redeploy and restart. The courses reload automatically, but learner progress is lost. The frontend recovers quietly: it keeps the learner's profile in the browser and, if the server no longer knows the email, recreates the account and shows a notice that progress starts fresh. Keeping the service awake prevents sleeping but not these wipes. To keep progress permanently, use a paid Render plan, add a disk in the service settings (mount path `/var/data`) and set `DATABASE_URL=sqlite+aiosqlite:////var/data/duolingo.db`.

The frontend also copes with Render's cold start: the landing page pings `/api/health` to wake the backend while the learner fills the form, and read requests retry for about 40 seconds when the backend answers 502, 503 or 504.

### 1. Push the project to GitHub

The repository root must contain `backend/`, `frontend/`, `render.yaml` and `.github/`.

### 2. Backend on Render

1. In Render choose New, then Blueprint, select the repository, and apply. `render.yaml` creates the `duolingo-backend` web service (free plan, Python 3.11, health check `/api/health`).
2. Or create a Web Service by hand with root directory `backend`, build command `pip install -r requirements.txt`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and environment variables `PYTHON_VERSION=3.11.9`, `DEV_TOOLS=false`.
3. When the deploy is live, open `https://<your-service>.onrender.com/api/health`. It should return `{"ok":true,...}`.

### 3. Frontend on Vercel

1. In Vercel choose Add New Project, import the repository, and set Root Directory to `frontend`.
2. Add the environment variable `BACKEND_API_URL=https://<your-service>.onrender.com` (no trailing slash) for Production and Preview.
3. Deploy. Next.js reads that variable at build time, so redeploy the frontend whenever the backend URL changes.

Browser requests go to your Vercel domain and are proxied to Render, so no CORS setup is needed.

### 4. Keep the Render service awake

Render's free service sleeps after 15 minutes without traffic, and the first request after that takes 30 to 60 seconds. `.github/workflows/keep-alive.yml` calls the health endpoint every 5 minutes.

1. In the GitHub repository open Settings, then Secrets and variables, then Actions, then Variables, and add `BACKEND_URL` = `https://<your-service>.onrender.com`.
2. Open the Actions tab, select "Keep backend awake" and run it once with "Run workflow" to confirm it passes.

Notes:
- GitHub's scheduler is best effort and can run late, so occasional sleeps can still happen. For a second ping source, add a free UptimeRobot HTTP monitor on the same health URL with a 5-minute interval.
- GitHub pauses scheduled workflows in repositories with no activity for 60 days. Re-enable it in the Actions tab if that happens.
- A free Render account has about 750 instance hours per month, which covers one always-on service. Do not run a second free service in the same account.

## Option B: single VPS

These steps assume Ubuntu 22.04 or 24.04 with a sudo user.

## 1. Install prerequisites

```bash
sudo apt update
sudo apt install -y python3 python3-venv git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
```

## 2. Get the code

```bash
git clone <your-repo-url> ~/duolingo && cd ~/duolingo
```

Or copy the folder with `scp -r`, leaving out `node_modules`, `.next`, `.venv` and `*.db`.

## 3. Backend

```bash
cd ~/duolingo/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
nano .env
```

Recommended `.env` for production:

```
DATABASE_URL=sqlite+aiosqlite:////home/<user>/duolingo/backend/duolingo.db
CORS_ORIGINS=https://your-domain.com
TIMEZONE=Asia/Kolkata
DEV_TOOLS=false
BACKUP_BEFORE_MIGRATE=true
```

Create `/etc/systemd/system/duolingo-backend.service`:

```ini
[Unit]
Description=Duolingo backend
After=network.target

[Service]
User=<user>
WorkingDirectory=/home/<user>/duolingo/backend
ExecStart=/home/<user>/duolingo/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now duolingo-backend
curl http://127.0.0.1:8001/api/health
```

On first start the backend creates the database and loads the Spanish, French and Hindi courses.

## 4. Frontend

`BACKEND_API_URL` is baked into the build, so set it before building:

```bash
cd ~/duolingo/frontend
yarn install --frozen-lockfile
BACKEND_API_URL=http://127.0.0.1:8001 yarn build
```

Create `/etc/systemd/system/duolingo-frontend.service`:

```ini
[Unit]
Description=Duolingo frontend
After=network.target duolingo-backend.service

[Service]
User=<user>
WorkingDirectory=/home/<user>/duolingo/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/yarn start
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now duolingo-frontend
curl http://127.0.0.1:3000/api/health
```

## 5. Public access with HTTPS (Caddy)

Point your domain's `A` record at the server and open ports 80 and 443.

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile <<'EOF'
your-domain.com {
	encode gzip
	reverse_proxy 127.0.0.1:3000
}
EOF
sudo systemctl reload caddy
```

Open `https://your-domain.com`. Caddy gets and renews the certificate automatically.

## 6. Move your existing local progress (optional)

Before first start of the backend (or after stopping it), copy your local `backend/duolingo.db` to the server path set in `DATABASE_URL`, then start the service. The backend upgrades the file on startup and writes a `.bak` copy beside it.

## Updating

```bash
cd ~/duolingo && git pull
cd backend && .venv/bin/pip install -r requirements.txt && sudo systemctl restart duolingo-backend
cd ../frontend && yarn install --frozen-lockfile && BACKEND_API_URL=http://127.0.0.1:8001 yarn build && sudo systemctl restart duolingo-frontend
```

Back up the database by copying `duolingo.db` (stop the backend first, or use `sqlite3 duolingo.db ".backup backup.db"`).

## Things to know

- There is no password login. A learner is identified by email, so anyone who knows an email can open that account. Add real authentication before putting private data in this app.
- Run exactly one backend process. SQLite does not suit several writers.
- If you host the frontend elsewhere (for example Vercel), set `BACKEND_API_URL` to the public backend URL in that platform's build settings and expose the backend over HTTPS with the database on a persistent disk.
