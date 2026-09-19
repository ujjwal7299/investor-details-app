# Fieldnote Submission Website

The project is separated into two applications:

- `frontend/`: Angular, TypeScript, Reactive Forms, and SCSS.
- `backend/`: Python Flask REST API with MongoDB.

Generated Angular output is stored under `frontend/.angular/build`; no `dist/` folder is required or committed.

## Run the backend

Prerequisites: Python 3.10+, MongoDB, and a MongoDB connection string.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item config/.env.example config/.env
# Set MONGODB_URI, MONGODB_DATABASE, and FRONTEND_URL in config/.env
python create_admin.py
python app.py
```

The API endpoint is `POST http://127.0.0.1:8080/api/users`.

## Run the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm start
```

Open `http://localhost:4200`. The frontend proxy forwards `/api` requests to the Python server at `127.0.0.1:8080`.

Use the `Admin` button in the top-right corner to sign in with `ADMIN_USER_ID` and `ADMIN_PASSWORD`. The dashboard is protected by the backend and lists investor records.

For production, serve the Angular production build from `frontend/.angular/build/upload-to-excel`, route `/api` to the PHP `backend/public` entrypoint, enable HTTPS, and never commit `backend/config/.env`, logs, or credentials.

## Data handling

Both Angular and Python validate the six fields. Mobile numbers are normalized to 10 digits, Aadhaar spaces are removed, and PAN is uppercased. Aadhaar is masked in the form. Reusing the same Aadhaar and PAN updates the existing MongoDB record under `updatedDetails` instead of creating a duplicate.

## Free deployment

Use MongoDB Atlas free tier, Render free web service for the Python API, and Netlify free static hosting for Angular.

1. Push this project to GitHub. Do not commit `backend/config/.env`.
2. In MongoDB Atlas, create a free cluster, database user, and network access rule. For a simple personal deployment, allow `0.0.0.0/0` with a strong database password.
3. In Render, create a new Blueprint from the repository. Render will use `render.yaml`. Set `MONGODB_URI` to the Atlas connection string and `FRONTEND_URL` temporarily to your future Netlify URL. Deploy and copy the Render URL, for example `https://investor-backend.onrender.com`.
4. Update [environment.prod.ts](frontend/src/environments/environment.prod.ts) so `apiUrl` is `https://YOUR-RENDER-URL.onrender.com/api`.
5. In Netlify, import the GitHub repository. Set base directory to `frontend`, build command to `npm run build -- --configuration production`, and publish directory to `frontend/.angular/build/upload-to-excel`.
6. Copy the final Netlify URL into Render's `FRONTEND_URL` environment variable and redeploy the backend.
7. Create the database admin once using the deployed MongoDB configuration: locally set the same Atlas URI in `backend/config/.env`, run `python create_admin.py`, then remove local credentials from files and restart the deployed service.

Render's free service sleeps when unused, so the first request after inactivity can take several seconds. Free hosting is suitable for personal testing, but Aadhaar and PAN are sensitive data: use HTTPS, a strong database password, a restricted admin account, and do not expose the MongoDB URI or admin password.
