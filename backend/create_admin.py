import getpass
import os

from dotenv import load_dotenv
from pymongo import ASCENDING, MongoClient
from werkzeug.security import generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "config", ".env"))

user_id = input("Admin user ID: ").strip()
password = getpass.getpass("Admin password: ")
confirm_password = getpass.getpass("Confirm admin password: ")

if not user_id or not password:
    raise SystemExit("User ID and password are required.")
if password != confirm_password:
    raise SystemExit("Passwords do not match.")

client = MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=5000)
database = client[os.getenv("MONGODB_DATABASE", "fieldnote")]
admins = database["admins"]
admins.create_index([("userId", ASCENDING)], unique=True)
admins.update_one(
    {"userId": user_id},
    {"$set": {"passwordHash": generate_password_hash(password)}},
    upsert=True,
)
print(f"Admin '{user_id}' saved in MongoDB.")
