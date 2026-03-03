from flask import Flask, render_template, redirect, url_for, jsonify, flash, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from flask_wtf.csrf import CSRFProtect
import uuid
import cloudinary
import cloudinary.uploader
import cloudinary.api
import os

# -------------------------
# Configuration
# -------------------------
app = Flask(__name__)
load_dotenv()
app.secret_key = os.getenv("APP_SECRET_KEY")
app.jinja_env.globals["datetime"] = datetime
csrf = CSRFProtect(app)

# -------------------------
# MongoDB Configuration (NO LOCAL DB)
# -------------------------
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["portfolio"]
comments_collection = db["comments"]
admins_collection = db["admins"]
projects_collection = db["projects"]
certificates_collection = db["certificates"]

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5MB

def allowed_file(file):
    return (
        file
        and "." in file.filename
        and file.filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
        and file.mimetype.startswith("image/")
    )

# -------------------------
# Admin Authentication
# -------------------------
def is_admin_logged_in() -> bool:
    return session.get("role") == "admin"

def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not is_admin_logged_in():
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper

# -------------------------
# Routes
# -------------------------
@app.route('/')
def home():
    comments = comments_collection.find({"approved": True}).sort("created_at", -1)
    projects = list(projects_collection.find().sort("created_at", -1))
    certificates = list(certificates_collection.find().sort("created_at", -1))
    return render_template("main/index.html", projects=projects, certificates=certificates)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        admin = admins_collection.find_one({"username": username})
        if admin and check_password_hash(admin["password_hash"], password):
            app.permanent_session_lifetime = timedelta(minutes=10)
            session["admin_id"] = str(admin["_id"])
            session["role"] = "admin"
            session["admin_username"] = username
            flash("Login successful!", "success")
            return redirect(url_for("admin_dashboard"))
        flash("Invalid credentials", "danger")

    return render_template("login.html")

@app.route('/admin')
@admin_required
def admin_dashboard():
    return render_template("admin/dashboard.html")

@app.route('/admin/comments')
@admin_required
def admin_comments():
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
        "admin/comments.html",
        comments=comments,
        search_query=q
    )

@app.route("/admin/add-project", methods=["GET"])
@admin_required
def add_project_page():
    projects = list(projects_collection.find().sort("created_at", -1))
    return render_template("admin/add_project.html", projects=projects)

@app.route("/admin/add-certificate", methods=["GET"])
@admin_required
def add_cert_page():
    certificates = list(certificates_collection.find().sort("created_at", -1))
    return render_template("admin/add_cert.html", certificates=certificates)

# -------------------------
# Logics
# -------------------------
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
    comments = comments_collection.find({"approved": True}).sort("created_at", -1)

    return jsonify([
        {
            "id": str(c["_id"]),
            "name": c["name"],
            "message": c["message"],
            "created_at": c["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        }
        for c in comments
    ])

@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out successfully', 'info')
    return redirect(url_for('login'))

@app.route('/admin/comments/toggle/<comment_id>', methods=['POST'])
@admin_required
def toggle_approval(comment_id):
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

@app.route('/admin/comments/delete/<comment_id>', methods=['POST'])
@admin_required
def delete_comment(comment_id):
    comments_collection.delete_one({"_id": ObjectId(comment_id)})
    flash("Comment deleted", "success")
    return redirect(url_for("admin_dashboard"))

@app.route("/admin/add-project", methods=["POST"])
@admin_required
def add_project():
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    tech_stack = request.form.get("tech_stack", "").strip()
    github_url = request.form.get("github_url", "").strip()
    live_url = request.form.get("live_url", "").strip()
    image = request.files.get("image")

    if not title or not description or not tech_stack:
        flash("Please fill all required fields", "danger")
        return redirect(url_for("admin_dashboard"))

    if not image or not allowed_file(image):
        flash("Invalid image file (PNG, JPG, WEBP only, max 5MB)", "danger")
        return redirect(url_for("admin_dashboard"))

    try:
        upload_result = cloudinary.uploader.upload(
            image,
            folder="portfolio/projects",
            resource_type="image",
            public_id=uuid.uuid4().hex,
            overwrite=True
        )

        image_url = upload_result["secure_url"]

        projects_collection.insert_one({
            "title": title,
            "description": description,
            "tech_stack": [t.strip() for t in tech_stack.split(",") if t.strip()],
            "github_url": github_url,
            "live_url": live_url,
            "image_url": image_url,
            "image_public_id": upload_result["public_id"],
            "created_at": datetime.utcnow()
        })
        flash("Project added successfully!", "success")

    except Exception as e:
        app.logger.error("Cloudinary upload failed (project): %s", e)
        flash("Image upload failed. Try again.", "danger")

    return redirect(url_for("admin_dashboard"))

@app.route("/admin/add-certificate", methods=["POST"])
@admin_required
def add_certificate():
    title = request.form.get("title", "").strip()
    issuer = request.form.get("issuer", "").strip()
    certificate_url = request.form.get("certificate_url", "").strip()
    image = request.files.get("image")

    if not title or not issuer:
        flash("Title and issuer are required", "danger")
        return redirect(url_for("admin_dashboard"))

    if not image or not allowed_file(image):
        flash("Invalid image file (PNG, JPG, WEBP only, max 5MB)", "danger")
        return redirect(url_for("admin_dashboard"))

    try:
        upload_result = cloudinary.uploader.upload(
            image,
            folder="portfolio/certificates",
            resource_type="image",
            public_id=uuid.uuid4().hex,
            overwrite=True
        )

        image_url = upload_result["secure_url"]

        certificates_collection.insert_one({
            "title": title,
            "issuer": issuer,
            "certificate_url": certificate_url,
            "image_url": image_url,
            "image_public_id": upload_result["public_id"],
            "created_at": datetime.utcnow()
        })

        flash("Certificate added successfully!", "success")

    except Exception as e:
        app.logger.error("Cloudinary upload failed (certificate): %s", e)
        flash("Certificate upload failed. Try again.", "danger")

    return redirect(url_for("admin_dashboard"))

@app.route("/admin/delete-project/<project_id>", methods=["POST"])
@admin_required
def delete_project(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        flash("Invalid project ID", "danger")
        return redirect(url_for("admin_dashboard"))

    project = projects_collection.find_one({"_id": oid})

    if not project:
        flash("Project not found", "danger")
        return redirect(url_for("admin_dashboard"))

    try:
        if project.get("image_public_id"):
            cloudinary.uploader.destroy(
                project["image_public_id"],
                resource_type="image"
            )
        projects_collection.delete_one({"_id": oid})
        flash("Project deleted successfully", "success")

    except Exception as e:
        app.logger.error("Delete project failed: %s", e)
        flash("Failed to delete project", "danger")

    return redirect(url_for("admin_dashboard"))

@app.route("/admin/projects/edit/<project_id>", methods=["GET", "POST"])
@admin_required
def edit_project(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        flash("Invalid project ID", "danger")
        return redirect(url_for("admin_dashboard"))

    project = projects_collection.find_one({"_id": oid})

    if not project:
        flash("Project not found", "danger")
        return redirect(url_for("admin_dashboard"))

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        tech_stack = request.form.get("tech_stack", "").strip()

        if not title or not description or not tech_stack:
            flash("All fields are required", "danger")
            return redirect(url_for("edit_project", project_id=project_id))

        projects_collection.update_one(
            {"_id": oid},
            {"$set": {
                "title": title,
                "description": description,
                "tech_stack": [t.strip() for t in tech_stack.split(",") if t.strip()],
                "updated_at": datetime.utcnow()
            }}
        )

        flash("Project updated successfully", "success")
        return redirect(url_for("admin_dashboard"))

    return render_template("admin/edit_project.html", project=project)

@app.route("/admin/delete-certificate/<cert_id>", methods=["POST"])
@admin_required
def delete_certificate(cert_id):
    try:
        oid = ObjectId(cert_id)
    except InvalidId:
        flash("Invalid certificate ID", "danger")
        return redirect(url_for("admin_dashboard"))

    cert = certificates_collection.find_one({"_id": oid})

    if not cert:
        flash("Certificate not found", "danger")
        return redirect(url_for("admin_dashboard"))

    try:
        if cert.get("image_public_id"):
            cloudinary.uploader.destroy(
                cert["image_public_id"],
                resource_type="image"
            )
        certificates_collection.delete_one({"_id": oid})
        flash("Certificate deleted successfully", "success")

    except Exception as e:
        app.logger.error("Delete certificate failed: %s", e)
        flash("Failed to delete certificate", "danger")

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
