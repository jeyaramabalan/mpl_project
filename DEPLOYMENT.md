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
     - `assets/` folder (JS and CSS)
     - `.htaccess` (already included in the build from `mpl-frontend/public/.htaccess`)

4. **.htaccess**  
   The repo includes `mpl-frontend/public/.htaccess`. Vite copies it into `dist/` when you run `npm run build`, so after upload it will be in the same directory as `index.html`. It sends all non-file requests to `index.html` so React Router works. If you already have an `.htaccess` on the server, merge the rewrite rules or replace with this one (see `mpl-frontend/public/.htaccess`).

5. **Backend**  
   If the backend is not on the same shared host, keep it running wherever it is now and set `VITE_API_URL` / `VITE_SOCKET_URL` in `.env.production` to that backend URL before building.

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

4. **Install and run**

   ```bash
   cd /path/to/mpl-backend
   npm install --production
   node server.js
   ```

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
