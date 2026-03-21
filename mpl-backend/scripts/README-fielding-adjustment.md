# Fielding impact columns (`ballbyball`)

If the admin UI shows **"Database missing fielding adjustment columns"** when adding manual fielding impact, run the migration on the **same MySQL database** your API uses.

**File:** `add-ball-fielding-adjustment.sql`

**Example (replace user, database, host):**

```bash
mysql -u YOUR_USER -p YOUR_DATABASE < mpl-backend/scripts/add-ball-fielding-adjustment.sql
```

On Windows (PowerShell), from the repo root:

```powershell
Get-Content mpl-backend\scripts\add-ball-fielding-adjustment.sql | mysql -u YOUR_USER -p YOUR_DATABASE
```

Restart the backend after applying. Re-run only once per database.
