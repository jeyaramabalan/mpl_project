# Deploying MPL to hosting.com

This guide walks you through hosting the MPL app (React frontend + Node/Express backend + MySQL) on **hosting.com**.

---

## Shared hosting (e.g. mpl.supersalessoft.com)

**Shared hosting can only serve static files** (HTML, JS, CSS). It cannot run Node.js. So:

- **Frontend:** Build the React app and upload the `dist/` folder (plus `.htaccess`) to the document root of your subdomain (e.g. `mpl.supersalessoft.com`).
- **Backend:** Must run elsewhere (same provider’s VPS, or a service like Render/Railway). Your frontend will call it via `VITE_API_URL` and `VITE_SOCKET_URL`. If your current live site already uses an API at the same domain, your host may be proxying `/api` to a backend; keep that setup and point the new build to the same API URL.

### Deploy frontend to shared hosting (mpl.supersalessoft.com)

1. **Build with production API URL**  
   Create `mpl-frontend/.env.production` (do not commit real secrets):

   ```env
   VITE_API_URL=https://mpl.supersalessoft.com/api
   VITE_SOCKET_URL=https://mpl.supersalessoft.com
   ```

   Use the same URLs if your backend is proxied on the same domain; otherwise use the real backend URL (e.g. `https://api.supersalessoft.com`).

2. **Build the app**

   ```bash
   cd mpl-frontend
   npm ci
   npm run build
   ```

3. **Upload to the server**  
   - Via **File Manager** (cPanel / Hosting Panel) or **FTP**, go to the folder that serves `mpl.supersalessoft.com` (often `public_html` or a subdomain folder).
   - Upload **all contents** of `mpl-frontend/dist/` into that folder:
     - `index.html` at the root
     - **Entire `assets/` folder** (all JS/CSS chunks — hashes change every build)
     - `.htaccess` (already included in the build from `mpl-frontend/public/.htaccess`)
   - **Important:** If you see *"Expected a JavaScript module but server responded with MIME type text/html"* for a file under `/assets/`, it usually means the server is missing that chunk (e.g. old `index.html` referencing a new hash, or new build uploaded without the new `assets/`). Re-upload the full `dist/` and do a hard refresh (Ctrl+Shift+R) or clear cache.

4. **.htaccess**  
   The repo includes `mpl-frontend/public/.htaccess`. Vite copies it into `dist/` when you run `npm run build`, so after upload it will be in the same directory as `index.html`. It sends only *frontend* routes to `index.html`; **`/api/` and `/socket.io/` are never rewritten** so they reach the backend (or proxy). If you previously saw the app’s “404 Page Not Found” when opening `/api/players` in the browser, or “No players found” on the Players page, the old rules were sending API requests to the SPA—replace with the current `.htaccess` and re-upload.

5. **Backend**  
   If the backend is not on the same shared host, keep it running wherever it is now and set `VITE_API_URL` / `VITE_SOCKET_URL` in `.env.production` to that backend URL before building.

---

## Two folders: frontend in domain root, backend in mplapi (mpl.supersalessoft.com)

On your server the **domain** `mpl.supersalessoft.com` is served from one folder (the “website” or document root), and the **Node backend** lives in another folder, **mplapi**. That’s the correct split.

- **Frontend (what the site “looks for”)**  
  The server serves the site from the **mpl.supersalessoft.com** folder. So that folder must contain the built frontend:
  - **Upload the contents of `mpl-frontend/dist/`** into the **mpl.supersalessoft.com** folder (the domain’s document root).
  - You must have there: **`index.html`** at the root, the **`assets/`** folder (with all built JS/CSS), and **`.htaccess`** (from `mpl-frontend/public/.htaccess`, copied into `dist/` by the build).
  - If that folder is empty or has no `index.html`, you get **403** or **404** when opening `https://mpl.supersalessoft.com/`.

- **Backend**  
  Stays in **mplapi** (Passenger or however you run Node). No frontend files need to be in mplapi for this setup.

- **How `/api` and `/socket.io` work**  
  When the browser requests `https://mpl.supersalessoft.com/api/...` or `.../socket.io/...`, the server must **proxy** those requests to the Node app in mplapi (e.g. `http://127.0.0.1:5000`). That is usually done in the **Apache vhost** (or server config) for `mpl.supersalessoft.com`, not in the frontend `.htaccess`. The frontend `.htaccess` only makes sure `/api` and `/socket.io` are *not* rewritten to `index.html`; the actual proxy to mplapi has to be configured by the host or in the vhost.

**Summary:** Put the **frontend** (build output) in the **mpl.supersalessoft.com** folder; keep the **backend** in **mplapi**; ensure the server proxies `/api` and `/socket.io` from the domain to the Node app.

---

## Passenger / Node at document root (e.g. mpl.supersalessoft.com with PassengerAppRoot)

If your `.htaccess` uses **Passenger** so that the **Node app (server.js) is the document root** (e.g. `PassengerAppRoot "/home/supersa2/mplapi"`, `PassengerBaseURI "/"`), then **every request**, including `GET /`, is handled by Express. There is no separate static folder for the frontend; the backend must serve it.

1. **Build the frontend** (same as above, with `VITE_API_URL` and `VITE_SOCKET_URL` pointing to the same origin, e.g. `https://mpl.supersalessoft.com` and `https://mpl.supersalessoft.com`).
2. **Copy the built frontend into the backend’s `public/` folder**  
   Copy *all contents* of `mpl-frontend/dist/` (e.g. `index.html`, `assets/`) into `mpl-backend/public/`. So on the server, `mplapi/public/index.html` and `mplapi/public/assets/` must exist.
3. **Deploy the backend** (including the updated `server.js` and the `public/` folder) to the Passenger app root (e.g. `/home/supersa2/mplapi`).
4. **Set `NODE_ENV=production`** on the server so Express serves static files and the SPA fallback from `public/`.

Then `GET /` returns `index.html`, and `/api/*` and `/socket.io` continue to work as before. You do **not** need the SPA rewrite rules in `.htaccess` for `/` in this setup; you can leave the Passenger block and optionally keep or remove the RewriteRules (Express handles routing).

---

## Socket.IO "server error" – proxy must forward `/socket.io`

If the REST API works (e.g. Schedule, Home load data) but the browser shows **"Socket connection error: server error"**, the reverse proxy is likely forwarding only `/api` to the Node app and not **`/socket.io`**. Socket.IO needs both HTTP long‑polling and (optionally) WebSocket for the same origin.

**Fix:** Configure the proxy so that requests to **`/socket.io`** are sent to the same Node process as `/api` (e.g. `http://127.0.0.1:5000`).

**Apache (vhost or .htaccess, if mod_proxy is allowed):**

```apache
# Proxy /api to Node backend
ProxyPass /api http://127.0.0.1:5000/api
ProxyPassReverse /api http://127.0.0.1:5000/api

# Proxy Socket.IO path to Node backend (required for live updates)
ProxyPass /socket.io http://127.0.0.1:5000/socket.io
ProxyPassReverse /socket.io http://127.0.0.1:5000/socket.io

# Optional: WebSocket upgrade for Socket.IO (if mod_proxy_wstunnel is available)
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /socket.io/(.*) ws://127.0.0.1:5000/socket.io/$1 [P,L]
```

Use `127.0.0.1:5000` only if Node runs on the same server; otherwise use the correct backend URL. If your host does not allow proxy in `.htaccess`, ask support to add the `/socket.io` proxy (and `/api` if needed) in the server/vhost config for `mpl.supersalessoft.com`.

Until the proxy is fixed, the site works but **live scoring updates** (Socket.IO) will not connect; the app will keep retrying and may log errors in the console.

---

## Only Players / Admin work – proxy must forward **all** of `/api`

If **Players page** and **Player profile** and **Admin** load data, but **Schedule**, **Standings**, **Leaderboard**, **Records**, **Champions**, and **Home** (upcoming matches) do not, the reverse proxy is likely forwarding only some paths to the Node backend (e.g. only `/api/players` and `/api/admin`).

**Required:** Every request under `/api` must go to the Node app, not just a few paths. Use a single proxy rule for the whole API prefix:

```apache
# Forward ALL /api/* to the Node backend (required for seasons, matches, standings, leaderboard, records)
ProxyPass /api http://127.0.0.1:5000/api
ProxyPassReverse /api http://127.0.0.1:5000/api
```

Do **not** proxy only `/api/players` and `/api/admin`; the app also needs:

- `/api/seasons/public` – Schedule, Standings, Leaderboard, Records
- `/api/matches` – Home, Schedule, Admin dashboard
- `/api/matches/champions` – Home, Champions page
- `/api/standings` – Standings, Records
- `/api/leaderboard` – Leaderboard, Home
- `/api/records` – Records

After changing the proxy, restart Apache (or reload config) and hard-refresh the site. Check the browser console: you should no longer see 404s for these paths.

---

## What you need (VPS / full stack on hosting.com)

- A **hosting.com** account (shared hosting, VPS, or dedicated).
- **Node.js** support (VPS/dedicated or a plan that supports Node; shared plans often don’t run Node).
- **MySQL** database (included in most hosting.com plans).
- (Optional) A domain pointed to your hosting.

---

## 1. Backend (Node API + Socket.IO)

The backend is in `mpl-backend/`. It serves the API at `/api` and Socket.IO on the same server.

### 1.1 Prepare the backend

1. **Environment variables**  
   Create a `.env` file on the server (or set variables in the Application Manager). Use **production** values only; never commit real secrets to git.

   Typical variables:

   ```env
   NODE_ENV=production
   PORT=5000
   FRONTEND_URL=https://your-domain.com

   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name

   JWT_SECRET=your_long_random_secret_here
   ```

   Replace `your-domain.com` with the URL where the frontend will be hosted.

2. **Database**  
   In hosting.com’s panel (cPanel or Hosting Panel):

   - Create a MySQL database and a user with full access to it.
   - Run your existing SQL schema/migrations so tables exist.
   - Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `.env` to match.

3. **Upload backend code**  
   Upload the contents of `mpl-backend/` (e.g. via FTP/SFTP or Git) to a folder on the server, e.g. `mpl-backend` or `api`. Do **not** upload `node_modules`; install on the server.

4. **CloudLinux / Node.js Selector (virtual environment)**  
   Node.js Selector stores dependencies in a **separate virtual-environment folder** and exposes them to the app via a **symlink** named `node_modules` in the application root. The application root must **not** contain a real folder or file named `node_modules`—only the symlink created by the host.

   - **When deploying:** Upload only application code (no `node_modules`). If a real `node_modules` directory exists in the app root (e.g. from an old deploy), **remove it** so the selector’s `node_modules` symlink can be used.
   - **After upload:** Activate the Node venv, `cd` to the application root (where `package.json` and `server.js` are), then run `npm install --omit=dev`. Packages will install into the virtual environment; the symlink makes them visible to the app.
   - Do not commit or upload a real `node_modules` from your machine; the repo already ignores `mpl-backend/node_modules/`.

5. **Install and run**

   ```bash
   cd /path/to/mpl-backend
   npm install --omit=dev
   npm start
   ```

   (On CloudLinux with Node.js Selector, ensure the app root has no real `node_modules` folder—only the symlink. See step 4 above.)

   For a permanent process, use one of:

   - **hosting.com Application Manager (VPS/Dedicated)**  
     - In cPanel → Application Manager, add a new application.
     - Set **Application root** to the folder where `server.js` and `package.json` are.
     - Set **Startup file** to `server.js` (or leave as per their Node template).
     - Set **Environment** to Production and add the same env vars as above.
     - Deploy/start the app. Note the URL they give you (e.g. `https://api.your-domain.com` or a subdomain).

   - **PM2 (if you have SSH)**  
     ```bash
     npm install -g pm2
     pm2 start server.js --name mpl-api
     pm2 save && pm2 startup
     ```

   - **Passenger**  
     Follow hosting.com’s docs for Node + Passenger if that’s what your plan uses.

5. **Note the backend URL**  
   You’ll need this for the frontend, e.g. `https://api.your-domain.com` (with no `/api` at the end; the app serves API at `/api`).

---

## 2. Frontend (Vite/React)

The frontend is in `mpl-frontend/`. You build it to static files and upload them.

### 2.1 Build for production

On your **local** machine (or CI):

1. Set the API and Socket URLs to your **hosted** backend:

   Create or edit `mpl-frontend/.env.production`:

   ```env
   VITE_API_URL=https://api.your-domain.com/api
   VITE_SOCKET_URL=https://api.your-domain.com
   ```

   Replace `https://api.your-domain.com` with the real backend URL from step 1.

2. Install and build:

   ```bash
   cd mpl-frontend
   npm ci
   npm run build
   ```

   Output will be in `mpl-frontend/dist/`.

### 2.2 Upload the frontend to hosting.com

**Option A – Static hosting (e.g. public_html)**

1. In the Hosting Panel / cPanel, open **File Manager** (or connect via FTP).
2. Go to the folder that serves your domain (often `public_html`).
3. Upload **all contents** of `mpl-frontend/dist/` into that folder (so `index.html` is at the root of the site).

**Option B – Subdomain or subfolder**

- Upload the contents of `dist/` to the folder that corresponds to your subdomain or path (e.g. `public_html/mpl` or the docroot of `app.your-domain.com`).

**Important:** The project includes `mpl-frontend/public/.htaccess`, which is copied to `dist/` on build. It configures Apache to serve `index.html` for all non-file routes so React Router works. Ensure the uploaded `dist/` contains this `.htaccess` in the same directory as `index.html`.

---

## 3. CORS and Socket.IO

The backend already uses `FRONTEND_URL` for CORS and Socket.IO. Set it to the **exact** URL of the frontend (with no trailing slash), e.g.:

```env
FRONTEND_URL=https://your-domain.com
```

If the frontend is on a subdomain, use that, e.g. `https://mpl.your-domain.com`.

---

## 4. Checklist

- [ ] MySQL database and user created; schema/migrations run.
- [ ] Backend `.env` (or Application Manager env) set with `DB_*`, `JWT_SECRET`, `FRONTEND_URL`, `PORT`, `NODE_ENV=production`.
- [ ] Backend code uploaded; `npm install --production` and `node server.js` (or Application Manager / PM2) running.
- [ ] Backend URL known (e.g. `https://api.your-domain.com`).
- [ ] Frontend built with `VITE_API_URL` and `VITE_SOCKET_URL` pointing to that backend.
- [ ] Contents of `mpl-frontend/dist/` uploaded to the correct web root; SPA fallback configured if needed.
- [ ] Browser: open the site, log in, and test API + live updates (Socket.IO).

---

## 5. If you use a different host

- **Frontend only (Vercel, Netlify, etc.):** Build as above, set `VITE_API_URL` and `VITE_SOCKET_URL` to your backend, then deploy the `dist/` folder (or connect the repo and set the same env vars in the dashboard).
- **Backend:** Any host that supports Node.js and MySQL (Railway, Render, a VPS, etc.). Set `FRONTEND_URL` to your frontend URL and expose the app on a URL you use for `VITE_API_URL` and `VITE_SOCKET_URL`.

For **hosting.com** specifically, use their docs and support for:

- [Application deployment](https://kb.hosting.com/docs/application-deployment)
- [Application Manager (Passenger)](https://kb.hosting.com/docs/using-the-application-manager-to-deploy-applications-with-passenger)
- [Hosting Panel](https://kb.hosting.com/docs/using-the-hosting-panel)
