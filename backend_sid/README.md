# SIH Backend (ARGO Data) – Quick Start

This guide helps you (and your teammates) set up the backend, create the database table, and insert ARGO NetCDF data into PostgreSQL.

## Prerequisites
- Node.js and npm installed
- PostgreSQL running locally
- Database connection (see `backend_sid/database/db.js`):
  - host: `localhost`
  - port: `5432`
  - user: `postgres`
  - database: `argo_data`
  - password: set in `database/db.js`

If the `argo_data` database does not exist, create it via pgAdmin or psql:
- psql example:
  - `createdb -h localhost -U postgres argo_data`

## Install dependencies
From the backend directory:

```powershell
# IMPORTANT: run all commands from the backend folder
cd "c:\Users\SIDDHANT SALUNKE\OneDrive\Desktop\SIHnew\backend_sid"
npm install
```

## Create/sync the table
Creates table `t1` if missing and ensures columns exist (temperature, salinity, oxygen, etc.).

```powershell
npm run create:table
```
Expected output:
```
Table t1 ensured and columns synchronized (oxygen, nitrate, depth, time_ts).
```

## Prepare ARGO data files
Place your `.nc` files anywhere under this folder:
```
backend_sid/Argo data/
```
The ingestion script scans this directory recursively.

## Inspect variables in a NetCDF file (optional but recommended)
Use this to confirm variable names for your dataset.

```powershell
# Option A: specify the file path explicitly
npm run read:variables -- --file "C:\Users\SIDDHANT SALUNKE\OneDrive\Desktop\SIHnew\backend_sid\Argo data\<your_file>.nc"

# Option B: let it auto-pick the first .nc under "Argo data" directory
npm run read:variables
```
This prints global attributes, all variables, and a summary of key variables. The code recognizes common names like `Temperature`, `Salinity`, `Pressure`, `Lat`, `Lon`, etc.

## Insert data into PostgreSQL
Ingests all `.nc` files from `backend_sid/Argo data/` into the `t1` table.

```powershell
npm run insert:argo
```
You’ll see logs like:
```
Found <N> .nc files. Starting ingestion...
Ingesting: <file>
Inserted <rows> rows from <file>
...
All done. Total rows inserted: <total>
```

Notes:
- The script requires these variables to insert a row: temperature, latitude, longitude, pressure, salinity.
- Time handling:
  - Prefers `JULD` (days since 1950-01-01 UTC) when present
  - Falls back to `TIME` (epoch seconds or milliseconds)

## Run the server (optional)
There is a simple Express server in `server.js` exposing a couple of endpoints.

```powershell
node server.js
```
- `GET /` – health check
- `GET /everything` – first 100 rows from `t1`
- `GET /latlong?lat=<lat>&lon=<lon>` – filter by exact latitude and longitude

Example:
```
http://localhost:3000/everything
http://localhost:3000/latlong?lat=22.695&lon=202.01
```

## npm scripts (package.json)
- `create:table` → `node create_table.js`
- `insert:argo` → `node insert_argo.js`
- `read:variables` → `node read_variables.js`

Remember: run them from the backend directory.

## Troubleshooting
- npm error: could not find package.json
  - Make sure you are in the backend folder: `.../SIHnew/backend_sid`
- PostgreSQL connection errors
  - Ensure Postgres is running and the `argo_data` DB exists
  - Verify credentials in `database/db.js`
- No `.nc` files found
  - Place files under `backend_sid/Argo data/` or pass a file path to `read:variables`
- Variables show as "not found" in the summary
  - Paste the `--- All Variables ---` section to adjust mappings if needed

## Folder structure (key files)
```
backend_sid/
  create_table.js       # Ensures/syncs the t1 table
  insert_argo.js        # Ingests all .nc files under "Argo data/"
  read_variables.js     # Prints variable summaries for a .nc file
  server.js             # Optional Express server for quick queries
  package.json          # npm scripts and dependencies
  database/
    db.js               # PostgreSQL connection config
  Argo data/            # Put your .nc files here
```
