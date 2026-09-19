import os
import re
import secrets
from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from bson import ObjectId
from bson.errors import InvalidId
from werkzeug.exceptions import HTTPException
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError
from werkzeug.security import check_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "config", ".env"))

app = Flask(__name__)
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:4200")
frontend_origins = [origin.strip().rstrip("/") for origin in frontend_url.split(",") if origin.strip()]
CORS(app, resources={r"/api/*": {"origins": frontend_origins}})

mongo_uri = os.getenv("MONGODB_URI")
mongo_client = None
database = None
users = None
admins = None
indexes_ready = False

NAME_PATTERN = re.compile(r"^[\w][\w .'-]*$", re.UNICODE)
MOBILE_PATTERN = re.compile(r"^(?:\+91)?[6-9]\d{9}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PAN_PATTERN = re.compile(r"^[A-Z]{5}\d{4}[A-Z]$")
ADMIN_SESSION_HOURS = 8
admin_sessions = {}


def ensure_database():
    global indexes_ready, mongo_client, database, users, admins
    if mongo_client is None:
        mongo_uri = os.getenv("MONGODB_URI")
        if not mongo_uri:
            raise RuntimeError("MONGODB_URI is not configured")
        mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        database = mongo_client[os.getenv("MONGODB_DATABASE", "fieldnote")]
        users = database["users"]
        admins = database["admins"]
    if not indexes_ready:
        users.create_index([("email", ASCENDING)])
        users.create_index([("mobile", ASCENDING)])
        users.create_index([("createdAt", DESCENDING)])
        users.create_index([("aadhaarNumber", ASCENDING), ("panNumber", ASCENDING)], unique=True)
        admins.create_index([("userId", ASCENDING)], unique=True)
        indexes_ready = True


def error_response(message, status, errors=None):
    body = {"success": False, "message": message}
    if errors:
        body["errors"] = errors
    return jsonify(body), status


def admin_session():
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    session = admin_sessions.get(token)
    if not session or session < datetime.now(timezone.utc).timestamp():
        if token in admin_sessions:
            del admin_sessions[token]
        return None
    return token


@app.get("/")
def health_check():
    return jsonify({"success": True, "message": "Backend is running"})


@app.post("/api/admin/login")
def admin_login():
    ensure_database()
    payload = request.get_json(silent=True) or {}
    admin = admins.find_one({"userId": str(payload.get("userId", ""))})
    if not admin or not check_password_hash(admin["passwordHash"], str(payload.get("password", ""))):
        return error_response("Invalid admin credentials", 401)
    token = secrets.token_urlsafe(32)
    admin_sessions[token] = datetime.now(timezone.utc).timestamp() + ADMIN_SESSION_HOURS * 3600
    return jsonify({"success": True, "message": "Admin login successful", "data": {"token": token}})


@app.post("/api/admin/logout")
def admin_logout():
    token = admin_session()
    if token:
        del admin_sessions[token]
    return jsonify({"success": True, "message": "Logged out"})


@app.get("/api/admin/investors")
def admin_investors():
    ensure_database()
    if not admin_session():
        return error_response("Admin login required", 401)
    records = []
    for user in users.find({}, {"updatedDetails": 1, "updatedAt": 1, "createdAt": 1, "name": 1, "email": 1, "mobile": 1, "address": 1, "aadhaarNumber": 1, "panNumber": 1}).sort("createdAt", DESCENDING):
        user["id"] = str(user.pop("_id"))
        for field in ("createdAt", "updatedAt"):
            if field in user and hasattr(user[field], "isoformat"):
                user[field] = user[field].isoformat()
        records.append(user)
    return jsonify({"success": True, "data": records})


@app.delete("/api/admin/investors/<investor_id>")
def delete_investor(investor_id):
    ensure_database()
    if not admin_session():
        return error_response("Admin login required", 401)
    try:
        result = users.delete_one({"_id": ObjectId(investor_id)})
    except InvalidId:
        return error_response("Invalid investor ID", 400)
    except PyMongoError:
        app.logger.exception("Investor delete failed")
        return error_response("Unable to remove investor. Please try again later.", 500)
    if result.deleted_count == 0:
        return error_response("Investor not found", 404)
    return jsonify({"success": True, "message": "Investor removed successfully"})


def validate_user(payload):
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    mobile = re.sub(r"[\s-]+", "", str(payload.get("mobile", "")))
    address = str(payload.get("address", "")).strip()
    aadhaar = re.sub(r"\s+", "", str(payload.get("aadhaarNumber", "")))
    pan = str(payload.get("panNumber", "")).strip().upper()
    errors = {}

    if not name:
        errors["name"] = "Name is required"
    elif not 2 <= len(name) <= 100 or not NAME_PATTERN.fullmatch(name):
        errors["name"] = "Please enter a valid name"

    if not email:
        errors["email"] = "Email is required"
    elif len(email) > 255 or not EMAIL_PATTERN.fullmatch(email):
        errors["email"] = "Please enter a valid email address"

    if not MOBILE_PATTERN.fullmatch(mobile):
        errors["mobile"] = "Please enter a valid mobile number"

    if not 5 <= len(address) <= 500:
        errors["address"] = "Address must be between 5 and 500 characters"

    if not re.fullmatch(r"\d{12}", aadhaar):
        errors["aadhaarNumber"] = "Please enter a valid Aadhaar number"

    if not PAN_PATTERN.fullmatch(pan):
        errors["panNumber"] = "Please enter a valid PAN number"

    normalized = {
        "name": name,
        "email": email,
        "mobile": mobile[3:] if mobile.startswith("+91") else mobile,
        "address": address,
        "aadhaarNumber": aadhaar,
        "panNumber": pan,
        "createdAt": datetime.now(timezone.utc),
    }
    return errors, normalized


@app.post("/api/users")
def create_user():
    ensure_database()
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("Request body must be valid JSON", 400)

    errors, user = validate_user(payload)
    if errors:
        return error_response("Validation failed", 422, errors)

    identity = {"aadhaarNumber": user["aadhaarNumber"], "panNumber": user["panNumber"]}
    editable_fields = ("name", "email", "mobile", "address")

    try:
        existing = users.find_one(identity)
        if existing:
            changed_details = {
                field: user[field]
                for field in editable_fields
                if existing.get(field) != user[field]
            }
            if not changed_details:
                users.update_one(identity, {"$unset": {
                    "updatedDetails": "",
                    "updatedAt": "",
                }})
                return jsonify({
                    "success": True,
                    "message": "No changes found",
                    "data": {"id": str(existing["_id"]), "updated": False},
                }), 200

            users.update_one(identity, {"$set": {
                "updatedDetails": changed_details,
                "updatedAt": datetime.now(timezone.utc),
            }})
            return jsonify({
                "success": True,
                "message": "User details updated successfully",
                "data": {"id": str(existing["_id"]), "updated": True},
            }), 200

        user["updatedDetails"] = {}
        result = users.insert_one(user)
    except DuplicateKeyError:
        existing = users.find_one(identity)
        if existing:
            changed_details = {
                field: user[field]
                for field in editable_fields
                if existing.get(field) != user[field]
            }
            if changed_details:
                users.update_one(identity, {"$set": {
                    "updatedDetails": changed_details,
                    "updatedAt": datetime.now(timezone.utc),
                }})
            else:
                users.update_one(identity, {"$unset": {
                    "updatedDetails": "",
                    "updatedAt": "",
                }})
            return jsonify({
                "success": True,
                "message": "User details updated successfully" if changed_details else "No changes found",
                "data": {"id": str(existing["_id"]), "updated": bool(changed_details)},
            }), 200
        return error_response("Unable to process your request. Please try again later.", 500)
    except PyMongoError:
        app.logger.exception("MongoDB insert failed")
        return error_response("Unable to process your request. Please try again later.", 500)

    return jsonify({
        "success": True,
        "message": "User submitted successfully",
        "data": {"id": str(result.inserted_id), "updated": False},
    }), 201


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    if isinstance(error, HTTPException):
        return error
    app.logger.exception("Unexpected server error")
    return error_response("Unable to process your request. Please try again later.", 500)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")), debug=False)
