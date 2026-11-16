# Deploying to a VPS (Caddy + DuckDNS)

This guide deploys Budget Tracker to a single VPS using Docker Compose, with
[Caddy](https://caddyserver.com/) as the HTTPS reverse proxy and a free
[DuckDNS](https://www.duckdns.org) subdomain as the public hostname.

Audience: comfortable with SSH and editing files on a Linux server; no prior
web-server or TLS experience assumed.

---

## How the pieces fit together

```
User's browser
  types https://mybudget.duckdns.org
        │
        ▼
DNS (DuckDNS)  ──→  returns your VPS's public IP
        │
        ▼
Caddy  (VPS, ports 80/443)
  - terminates TLS (auto Let's Encrypt cert)
  - "/"             → localhost:3000   (Next.js app)
  - "/receipts-s3/" → localhost:9090   (S3 receipt store)
        │
        ▼
Docker Compose services (internal network only)
  - app      (Next.js, port 3000)
  - worker   (recurring-transaction sweep)
  - postgres (never published to the host)
  - s3       (never published to the host)
```

Caddy is the only thing listening on a public port. Postgres and the S3 store
are reachable only by the app and worker containers over the internal Docker
network, plus S3 through Caddy's `/receipts-s3/` path for browser uploads.

---

## Prerequisites

- A VPS running Ubuntu/Debian (any recent release).
- SSH access to it.
- Ports **80** and **443** open in your VPS provider's firewall/security group.

---

## 1. Install Docker and Caddy on the VPS

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in for the group to take effect

# Caddy (official repo — installs a systemd service)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

---

## 2. Get a free DuckDNS subdomain

1. Go to <https://www.duckdns.org> and sign in (Google or GitHub login works).
2. Choose a name, e.g. `mybudget` — this gives you **`mybudget.duckdns.org`**.
3. Enter your VPS's **public IP** in the IP field and click **update**.

DuckDNS will show you a cron one-liner to keep the record updated if your IP
ever changes. Install it if your VPS does not have a static IP:

```bash
# DuckDNS prints the exact URL with your token — copy it from their page.
# Do NOT commit the token anywhere.
crontab -e
# add:  */5 * * * * curl -sk "https://www.duckdns.org/update?domains=YOURDOMAIN&token=YOURTOKEN&ip="
```

---

## 3. Get the code onto the VPS

```bash
git clone <your-repo-url> budget-tracker
cd budget-tracker
```

---

## 4. Create the production `.env`

```bash
cp .env.example .env
nano .env
```

Fill in the values:

```bash
# Generate a fresh secret (do not reuse the dev one):
#   openssl rand -base64 32
AUTH_SECRET=

# OAuth apps — see README "OAuth setup" for click-by-click instructions.
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# The public URL users type into their browser.
APP_URL=https://mybudget.duckdns.org

# S3 — internal endpoint stays on the Docker network.
S3_ENDPOINT=http://s3:9090
# Public endpoint: how the browser reaches receipt images, routed via Caddy.
S3_PUBLIC_ENDPOINT=https://mybudget.duckdns.org/receipts-s3
AWS_ACCESS_KEY_ID=s3mock
AWS_SECRET_ACCESS_KEY=s3mock
AWS_DEFAULT_REGION=us-east-1
S3_BUCKET=receipts
```

> `DATABASE_URL` is overridden by `docker-compose.yml` to point at the
> `postgres` container, so leave it as it is in the template.

---

## 5. Stop publishing the database and S3 ports

`docker-compose.prod.yml` in the repo root overrides the base file so Postgres
and S3 are not reachable from outside Docker. Nothing to edit — it is used in
the next step.

---

## 6. Configure Caddy

```bash
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
mybudget.duckdns.org {
	# Next.js app
	reverse_proxy localhost:3000

	# S3 receipt storage — only reachable through this path
	handle_path /receipts-s3/* {
		reverse_proxy localhost:9090
	}

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
	}
}
```

Start Caddy:

```bash
sudo systemctl enable --now caddy
sudo systemctl restart caddy
```

Caddy automatically obtains and renews a Let's Encrypt TLS certificate for
`mybudget.duckdns.org`. If it cannot, check `journalctl -u caddy` — the usual
cause is that DNS has not propagated yet or port 80 is blocked.

---

## 7. Start the application

```bash
npm run deploy
```

This runs four services: the Next.js app, the recurring-transaction worker,
Postgres, and the S3 receipt store.

---

## 8. Point your OAuth apps at the new domain

In the Google Cloud Console and GitHub OAuth app settings, set the authorized
redirect URIs to:

```
https://mybudget.duckdns.org/api/auth/callback/google
https://mybudget.duckdns.org/api/auth/callback/github
```

---

## 9. Verify

```bash
# App responds over HTTPS
curl -I https://mybudget.duckdns.org

# PWA assets are served
curl -I https://mybudget.duckdns.org/manifest.webmanifest
curl -I https://mybudget.duckdns.org/sw.js

# Postgres must NOT be reachable from outside (should time out / be refused)
nc -zv mybudget.duckdns.org 5432
```

Then open `https://mybudget.duckdns.org` in a browser, sign in, and confirm the
PWA install prompt appears.

---

## Security notes

- The default database credentials in `docker-compose.yml` (`budget` / `budget`)
  are development defaults. Change `POSTGRES_USER`, `POSTGRES_PASSWORD`, and the
  matching `DATABASE_URL` before exposing this to anyone but yourself.
- Keep `.env` out of version control (it is already in `.gitignore`).
- Never commit the DuckDNS token or any OAuth client secret.
- The S3 store (`adobe/s3mock`) is a development mock with fixed credentials.
  It is acceptable for a personal deployment where only you use the app; for
  anything shared, replace it with a real S3 bucket or MinIO with proper
  credentials and private access.

---

## Updating the deployment

```bash
cd budget-tracker
git pull
npm run deploy
```

Migrations run automatically on container start (`prisma migrate deploy`).

---

## Switching to a real domain later

1. Point the domain's A record at your VPS IP.
2. Replace `mybudget.duckdns.org` in the Caddyfile, `APP_URL`, and
   `S3_PUBLIC_ENDPOINT`.
3. Update the OAuth redirect URIs.
4. `sudo systemctl restart caddy`.
