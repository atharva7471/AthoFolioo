from flask import Flask, render_template, redirect, url_for, jsonify, flash, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from flask_wtf import FlaskForm
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
import os

# -------------------------
# Configuration
# -------------------------
app = Flask(__name__)
load_dotenv()
app.secret_key = os.getenv("APP_SECRET_KEY")

# -------------------------
# MongoDB Configuration (NO LOCAL DB)
# -------------------------
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["portfolio"] 
comments_collection = db["comments"]
admins_collection = db["admins"]

# -------------------------
# Routes
# -------------------------
@app.route('/')
def home():
    comments = comments_collection.find(
        {"approved": True}
    ).sort("created_at", -1)
    return render_template("index.html")

@app.route('/submit', methods=['POST'])
def submit():
    name = request.form.get("name")
    email = request.form.get("email")
    message = request.form.get("message")

    if not (name and email and message):
        return jsonify({"success": False, "message": "Please fill all fields."}), 400

    comments_collection.insert_one({
        "name": name,
        "email": email,
        "message": message,
        "approved": False,
        "created_at": datetime.utcnow()
    })

    return jsonify({"success": True, "message": "Comment submitted successfully!"}), 201

@app.route('/comments')
def get_comments():
    comments = comments_collection.find(
        {"approved": True}
    ).sort("created_at", -1)

    return jsonify([
        {
            "id": str(c["_id"]),
            "name": c["name"],
            "message": c["message"],
            "created_at": c["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        }
        for c in comments
    ])
    
# -------------------------
# Admin: Login / Logout / Dashboard
# -------------------------
def is_admin_logged_in() -> bool:
    return session.get("role") == "admin"

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        admin = admins_collection.find_one({"username": username})
        if admin and check_password_hash(admin["password_hash"], password):
            session.permanent = True
            session["admin_id"] = str(admin["_id"])
            session["role"] = "admin"
            session["admin_username"] = username
            flash("Login successful!", "success")
            return redirect(url_for("admin_dashboard"))

        flash("Invalid credentials", "danger")

    return render_template("login.html")

@app.route('/logout')
def logout():
    session.pop('admin_id', None)
    session.pop('role', None)
    session.pop('admin_username', None)
    flash('Logged out successfully', 'info')
    return redirect(url_for('login'))

@app.route('/admin')
def admin_dashboard():
    if not is_admin_logged_in():
        return redirect(url_for('login'))

    q = request.args.get("q", "").strip()

    query = {}
    if q:
        query = {
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"message": {"$regex": q, "$options": "i"}}
            ]
        }

    comments = list(comments_collection.find(query).sort("created_at", -1))

    return render_template(
    "admin.html",
    comments=comments,
    datetime=datetime,
    search_query=q
)


@app.route('/toggle_approval/<comment_id>', methods=['POST'])
def toggle_approval(comment_id):
    if not is_admin_logged_in():
        return redirect(url_for('login'))

    comment = comments_collection.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        flash("Comment not found", "danger")
        return redirect(url_for("admin_dashboard"))

    new_state = not comment["approved"]


    comments_collection.update_one(
        {"_id": ObjectId(comment_id)},
        {"$set": {"approved": new_state}}
    )

    flash("Approval updated", "success")
    return redirect(url_for("admin_dashboard"))

@app.route('/delete/<comment_id>', methods=['POST'])
def delete_comment(comment_id):
    if not is_admin_logged_in():
        return redirect(url_for('login'))

    comments_collection.delete_one({"_id": ObjectId(comment_id)})
    flash("Comment deleted", "success")
    return redirect(url_for("admin_dashboard"))

# -------------------------
# App run / DB init
# -------------------------
if __name__ == "__main__":
    app.run(
        debug=os.environ.get("FLASK_DEBUG", "1") == "1",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000))
    )
