# Fieldnote Submission API

Simple Python Flask API for storing user submissions in MongoDB. Excel integration is planned for version 2.

## Requirements

- Python 3.10+
- MongoDB 5+

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item config/.env.example config/.env
python app.py
```

Set `MONGODB_URI`, `MONGODB_DATABASE`, and `FRONTEND_URL` in `config/.env`. The API creates non-unique indexes for `email`, `mobile`, and descending `createdAt` on startup.

Create or update the admin account in MongoDB. The password is entered interactively and saved only as a hash:

```powershell
python create_admin.py
```

When prompted, enter your admin user ID and password. This creates the `admins` collection record used by the dashboard login.

The admin dashboard uses `POST /api/admin/login` and the protected `GET /api/admin/investors` endpoint. The login token is held in memory by the development server and expires after eight hours.

The Angular application expects the API at `/api`; the frontend proxy forwards it to `http://127.0.0.1:8080`.

## Endpoint

`POST /api/users`

```json
{
  "name": "Rahul Kumar",
  "email": "rahul@example.com",
  "mobile": "9876543210",
  "aadhaarNumber": "123456789012",
  "panNumber": "ABCDE1234F"
}
```

The request is validated and normalized before MongoDB storage. Aadhaar and PAN together identify a record. The first submission creates the document with `updatedDetails: {}`. A later submission with the same Aadhaar and PAN keeps the same MongoDB `_id` and stores the latest name, email, mobile, and address under `updatedDetails`, along with `updatedAt`. Internal exceptions are not sent to clients. Excel processing is intentionally not part of version 1.

## Production notes

- Run the API behind HTTPS and a production WSGI server.
- Keep `.env`, workbook files, and logs outside public downloads.
- Back up MongoDB independently.
