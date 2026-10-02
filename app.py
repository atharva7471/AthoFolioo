from flask import Flask, render_template, redirect, url_for, jsonify, flash, request, session, send_from_directory
from werkzeug.security import check_password_hash
from datetime import datetime, timedelta
from functools import wraps
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from flask_wtf.csrf import CSRFProtect
import cloudinary
import cloudinary.uploader
import os
import random
import uuid
import traceback
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# -------------------------
# Configuration
# -------------------------
app = Flask(__name__)
load_dotenv()
app.secret_key = os.getenv("APP_SECRET_KEY")
app.jinja_env.globals["datetime"] = datetime
csrf = CSRFProtect(app)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# -------------------------
# Security Headers
# -------------------------
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# -------------------------
# Error Handlers
# -------------------------
@app.errorhandler(404)
def not_found_error(error):
    return render_template("main/error.html", error_code="404", error_title="Lost in the Void", error_message="The page you are looking for has been moved, deleted, or never existed in this dimension."), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template("main/error.html", error_code="500", error_title="System Anomaly", error_message="A critical exception occurred within the core architecture. My systems have been notified."), 500

@app.errorhandler(Exception)
def handle_exception(e):
    # Pass through HTTP errors
    if hasattr(e, 'code') and isinstance(e.code, int):
        if e.code == 404:
            return not_found_error(e)
        return render_template("main/error.html", error_code=str(e.code), error_title="Unexpected State", error_message=str(e)), e.code
    
    app.logger.error(f"Unhandled Exception: {e}")
    return internal_error(e)

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
wallpapers_collection = db["wallpapers"]
settings_collection = db["settings"]

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

ALLOWED_RESUME_EXTENSIONS = {"pdf", "doc", "docx"}

def allowed_resume_file(file):
    return (
        file
        and "." in file.filename
        and file.filename.rsplit(".", 1)[1].lower() in ALLOWED_RESUME_EXTENSIONS
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
# Jinja Filters
# -------------------------
@app.template_filter('cloudinary_opt')
def cloudinary_opt(url, width=None):
    if not url or 'cloudinary' not in url:
        return url
    parts = url.split('upload/')
    if len(parts) == 2:
        transform = "f_auto,q_auto"
        if width:
            transform += f",c_limit,w_{width}"
        return f"{parts[0]}upload/{transform}/{parts[1]}"
    return url

@app.context_processor
def inject_resume_url():
    return {"global_resume_url": url_for('serve_resume')}

@app.route("/resume")
def serve_resume():
    try:
        resume_data = settings_collection.find_one({"key": "resume_file_data"})
        if resume_data and resume_data.get("data"):
            from io import BytesIO
            from flask import send_file
            
            filename = resume_data.get("filename", "resume.pdf")
            if filename.lower().endswith(".pdf"):
                mimetype = "application/pdf"
            elif filename.lower().endswith(".doc"):
                mimetype = "application/msword"
            elif filename.lower().endswith(".docx"):
                mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            else:
                mimetype = "application/octet-stream"

            return send_file(
                BytesIO(resume_data["data"]),
                mimetype=mimetype,
                as_attachment=False,
                download_name=filename
            )
    except Exception as e:
        app.logger.error(f"Error serving resume from DB: {e}")
        
    return redirect(url_for('static', filename='assets/resume.pdf'))

# -------------------------
# Routes
# -------------------------
@app.route('/robots.txt')
def robots():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'robots.txt')

@app.route('/sitemap.xml')
def sitemap():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'sitemap.xml')

@app.route('/')
def home():
    try:
        comments = comments_collection.find({"approved": True}).sort("created_at", -1)
        projects = list(projects_collection.find().sort([("priority", 1), ("created_at", -1)]))
        certificates = list(certificates_collection.find().sort([("priority", 1), ("created_at", -1)]))
        
        # Get random hero background images
        hero_bgs = []
        try:
            db_wallpapers = list(wallpapers_collection.find({"active": {"$ne": False}}))
            if db_wallpapers:
                hero_bgs = [wp["image_url"] for wp in db_wallpapers]
                random.shuffle(hero_bgs)
            else:
                image_dir = os.path.join(app.root_path, 'static', 'assets', 'images')
                images = [f for f in os.listdir(image_dir) if os.path.isfile(os.path.join(image_dir, f)) and f.lower().endswith('.webp') and 'mountain' in f.lower()]
                if images:
                    hero_bgs = [url_for('static', filename='assets/images/' + img) for img in images]
                    random.shuffle(hero_bgs)
        except Exception as e:
            app.logger.warning(f"Could not load hero images: {e}")

        if not hero_bgs:
            hero_bgs = [url_for('static', filename='assets/images/mountain1.webp')]

        return render_template("main/index.html", projects=projects, certificates=certificates, hero_bgs=hero_bgs)
    except Exception as e:
        app.logger.error(f"Database error on home page: {e}")
        # Fallback to empty data gracefully instead of 500
        return render_template("main/index.html", projects=[], certificates=[], hero_bgs=[url_for('static', filename='assets/images/mountain1.webp')])

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
@csrf.exempt
@limiter.limit("5 per minute")
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
        return redirect(request.referrer or url_for("admin_dashboard"))

    new_state = not comment["approved"]
    comments_collection.update_one(
        {"_id": ObjectId(comment_id)},
        {"$set": {"approved": new_state}}
    )
    flash("Approval updated", "success")
    return redirect(request.referrer or url_for("admin_dashboard"))

@app.route('/admin/comments/delete/<comment_id>', methods=['POST'])
@admin_required
def delete_comment(comment_id):
    comments_collection.delete_one({"_id": ObjectId(comment_id)})
    flash("Comment deleted", "success")
    return redirect(request.referrer or url_for("admin_dashboard"))

@app.route("/admin/add-project", methods=["POST"])
@admin_required
def add_project():
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    tech_stack = request.form.get("tech_stack", "").strip()
    github_url = request.form.get("github_url", "").strip()
    live_url = request.form.get("live_url", "").strip()
    category = request.form.get("category", "Software Engineering").strip()
    
    priority_str = request.form.get("priority", "100").strip()
    try:
        priority = int(priority_str)
    except ValueError:
        priority = 100
        
    image = request.files.get("image")

    if not title or not description or not tech_stack:
        flash("Please fill all required fields", "danger")
        return redirect(url_for("add_project_page"))

    if not image or not allowed_file(image):
        flash("Invalid image file (PNG, JPG, WEBP only, max 5MB)", "danger")
        return redirect(url_for("add_project_page"))

    try:
        image.stream.seek(0)  # ensure stream is at start
        upload_result = cloudinary.uploader.upload(
            image.stream,
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
            "category": category,
            "github_url": github_url,
            "live_url": live_url,
            "priority": priority,
            "image_url": image_url,
            "image_public_id": upload_result["public_id"],
            "created_at": datetime.utcnow()
        })
        flash("Project added successfully!", "success")

    except Exception as e:
        traceback.print_exc()
        app.logger.error("Cloudinary upload failed (project): %s", e)
        flash(f"Image upload failed: {e}", "danger")

    return redirect(request.referrer or url_for("admin_dashboard"))

@app.route("/admin/add-certificate", methods=["POST"])
@admin_required
def add_certificate():
    title = request.form.get("title", "").strip()
    issuer = request.form.get("issuer", "").strip()
    certificate_url = request.form.get("certificate_url", "").strip()
    
    priority_str = request.form.get("priority", "100").strip()
    try:
        priority = int(priority_str)
    except ValueError:
        priority = 100
        
    image = request.files.get("image")

    if not title or not issuer:
        flash("Title and issuer are required", "danger")
        return redirect(url_for("add_cert_page"))

    if not image or not allowed_file(image):
        flash("Invalid image file (PNG, JPG, WEBP only, max 5MB)", "danger")
        return redirect(url_for("add_cert_page"))

    try:
        image.stream.seek(0)  # ensure stream is at start
        upload_result = cloudinary.uploader.upload(
            image.stream,
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
            "priority": priority,
            "image_url": image_url,
            "image_public_id": upload_result["public_id"],
            "created_at": datetime.utcnow()
        })

        flash("Certificate added successfully!", "success")

    except Exception as e:
        traceback.print_exc()
        app.logger.error("Cloudinary upload failed (certificate): %s", e)
        flash(f"Certificate upload failed: {e}", "danger")


    return redirect(request.referrer or url_for("admin_dashboard"))

@app.route("/admin/delete-project/<project_id>", methods=["POST"])
@admin_required
def delete_project(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        flash("Invalid project ID", "danger")
        return redirect(request.referrer or url_for("admin_dashboard"))

    project = projects_collection.find_one({"_id": oid})

    if not project:
        flash("Project not found", "danger")
        return redirect(request.referrer or url_for("admin_dashboard"))

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

    return redirect(request.referrer or url_for("admin_dashboard"))

@app.route("/admin/projects/edit/<project_id>", methods=["GET", "POST"])
@admin_required
def edit_project(project_id):
    try:
        oid = ObjectId(project_id)
    except InvalidId:
        flash("Invalid project ID", "danger")
        return redirect(request.referrer or url_for("admin_dashboard"))

    project = projects_collection.find_one({"_id": oid})

    if not project:
        flash("Project not found", "danger")
        return redirect(request.referrer or url_for("admin_dashboard"))

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        tech_stack = request.form.get("tech_stack", "").strip()
        github_url = request.form.get("github_url", "").strip()
        live_url = request.form.get("live_url", "").strip()
        category = request.form.get("category", "Software Engineering").strip()
        
        priority_str = request.form.get("priority", "100").strip()
        try:
            priority = int(priority_str)
        except ValueError:
            priority = 100
            
        image = request.files.get("image")

        if not title or not description or not tech_stack:
            flash("All fields are required", "danger")
            return redirect(url_for("edit_project", project_id=project_id))

        update_data = {
            "title": title,
            "description": description,
            "tech_stack": [t.strip() for t in tech_stack.split(",") if t.strip()],
            "category": category,
            "priority": priority,
            "github_url": github_url,
            "live_url": live_url,
            "updated_at": datetime.utcnow()
        }

        if image and allowed_file(image):
            try:
                image.stream.seek(0)
                upload_result = cloudinary.uploader.upload(
                    image.stream,
                    folder="portfolio/projects",
                    resource_type="image",
                    public_id=uuid.uuid4().hex,
                    overwrite=True
                )
                
                if project.get("image_public_id"):
                    cloudinary.uploader.destroy(
                        project["image_public_id"],
                        resource_type="image"
                    )

                update_data["image_url"] = upload_result["secure_url"]
                update_data["image_public_id"] = upload_result["public_id"]
            except Exception as e:
                traceback.print_exc()
                app.logger.error("Cloudinary upload failed (project edit): %s", e)
                flash(f"Image upload failed: {e}", "danger")
                return redirect(url_for("edit_project", project_id=project_id))

        projects_collection.update_one(
            {"_id": oid},
            {"$set": update_data}
        )

        flash("Project updated successfully", "success")
        return redirect(request.referrer or url_for("admin_dashboard"))

    return render_template("admin/edit_project.html", project=project)

@app.route("/admin/edit-certificate/<cert_id>", methods=["GET", "POST"])
@admin_required
def edit_certificate(cert_id):
    try:
        oid = ObjectId(cert_id)
    except InvalidId:
        flash("Invalid certificate ID", "danger")
        return redirect(request.referrer or url_for("admin_dashboard"))

    cert = certificates_collection.find_one({"_id": oid})
    if not cert:
        flash("Certificate not found", "danger")
        return redirect(request.referrer or url_for("admin_dashboard"))

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        issuer = request.form.get("issuer", "").strip()
        certificate_url = request.form.get("certificate_url", "").strip()
        
        priority_str = request.form.get("priority", "100").strip()
        try:
            priority = int(priority_str)
        except ValueError:
            priority = 100
            
        image = request.files.get("image")

        if not title or not issuer:
            flash("Title and issuer are required", "danger")
            return redirect(url_for("edit_certificate", cert_id=cert_id))

        update_data = {
            "title": title,
            "issuer": issuer,
            "priority": priority,
            "certificate_url": certificate_url,
            "updated_at": datetime.utcnow()
        }

        if image and allowed_file(image):
            try:
                image.stream.seek(0)
                upload_result = cloudinary.uploader.upload(
                    image.stream,
                    folder="portfolio/certificates",
                    resource_type="image",
                    public_id=uuid.uuid4().hex,
                    overwrite=True
                )
                
                # Delete old image if it exists and is different
                if cert.get("image_public_id") and cert["image_public_id"] != upload_result["public_id"]:
                    cloudinary.uploader.destroy(
                        cert["image_public_id"],
                        resource_type="image"
                    )

                update_data["image_url"] = upload_result["secure_url"]
                update_data["image_public_id"] = upload_result["public_id"]

            except Exception as e:
                traceback.print_exc()
                app.logger.error("Cloudinary upload failed: %s", e)
                flash(f"Image upload failed: {e}", "danger")
                return redirect(url_for("edit_certificate", cert_id=cert_id))

        certificates_collection.update_one(
            {"_id": oid},
            {"$set": update_data}
        )

        flash("Certificate updated successfully", "success")
        return redirect(request.referrer or url_for("admin_dashboard"))

    return render_template("admin/edit_cert.html", cert=cert)

@app.route("/admin/delete-certificate/<cert_id>", methods=["POST"])
@admin_required
def delete_certificate(cert_id):
    try:
        oid = ObjectId(cert_id)
    except InvalidId:
        flash("Invalid certificate ID", "danger")
        return redirect(request.referrer or url_for("admin_dashboard"))

    cert = certificates_collection.find_one({"_id": oid})

    if not cert:
        flash("Certificate not found", "danger")
        return redirect(request.referrer or url_for("admin_dashboard"))

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

    return redirect(request.referrer or url_for("admin_dashboard"))

@app.route("/admin/wallpapers", methods=["GET"])
@admin_required
def admin_wallpapers():
    wallpapers = list(wallpapers_collection.find().sort("created_at", -1))
    return render_template("admin/wallpapers.html", wallpapers=wallpapers)

@app.route("/admin/add-wallpaper", methods=["POST"])
@admin_required
def add_wallpaper():
    image = request.files.get("image")
    if not image or not allowed_file(image):
        flash("Invalid image file (PNG, JPG, WEBP only, max 5MB)", "danger")
        return redirect(url_for("admin_wallpapers"))
    
    try:
        image.stream.seek(0)
        upload_result = cloudinary.uploader.upload(
            image.stream,
            folder="portfolio/wallpapers",
            resource_type="image",
            public_id=uuid.uuid4().hex,
            overwrite=True
        )
        
        wallpapers_collection.insert_one({
            "image_url": upload_result["secure_url"],
            "image_public_id": upload_result["public_id"],
            "created_at": datetime.utcnow()
        })
        flash("Wallpaper added successfully!", "success")
    except Exception as e:
        app.logger.error("Cloudinary upload failed (wallpaper): %s", e)
        flash(f"Wallpaper upload failed: {e}", "danger")
        
    return redirect(url_for("admin_wallpapers"))

@app.route("/admin/toggle-wallpaper/<wp_id>", methods=["POST"])
@admin_required
def toggle_wallpaper(wp_id):
    try:
        oid = ObjectId(wp_id)
    except InvalidId:
        flash("Invalid wallpaper ID", "danger")
        return redirect(url_for("admin_wallpapers"))
        
    wp = wallpapers_collection.find_one({"_id": oid})
    if not wp:
        flash("Wallpaper not found", "danger")
        return redirect(url_for("admin_wallpapers"))
        
    try:
        new_state = False if wp.get("active", True) else True
        wallpapers_collection.update_one({"_id": oid}, {"$set": {"active": new_state}})
        flash(f"Wallpaper marked as {'Active' if new_state else 'Inactive'}", "success")
    except Exception as e:
        app.logger.error("Toggle wallpaper failed: %s", e)
        flash("Failed to toggle wallpaper status", "danger")
        
    return redirect(url_for("admin_wallpapers"))

@app.route("/admin/delete-wallpaper/<wp_id>", methods=["POST"])
@admin_required
def delete_wallpaper(wp_id):
    try:
        oid = ObjectId(wp_id)
    except InvalidId:
        flash("Invalid wallpaper ID", "danger")
        return redirect(url_for("admin_wallpapers"))
        
    wp = wallpapers_collection.find_one({"_id": oid})
    if not wp:
        flash("Wallpaper not found", "danger")
        return redirect(url_for("admin_wallpapers"))
        
    try:
        if wp.get("image_public_id"):
            cloudinary.uploader.destroy(wp["image_public_id"], resource_type="image")
        wallpapers_collection.delete_one({"_id": oid})
        flash("Wallpaper deleted successfully", "success")
    except Exception as e:
        app.logger.error("Delete wallpaper failed: %s", e)
        flash("Failed to delete wallpaper", "danger")
        
    return redirect(url_for("admin_wallpapers"))

@app.route("/admin/resume", methods=["GET"])
@admin_required
def admin_resume():
    return render_template("admin/resume.html")

@app.route("/admin/update-resume", methods=["POST"])
@admin_required
def update_resume():
    resume_file = request.files.get("resume_file")
    if not resume_file or not allowed_resume_file(resume_file):
        flash("Invalid resume file (PDF, DOC, DOCX only)", "danger")
        return redirect(url_for("admin_resume"))
        
    try:
        resume_file.stream.seek(0)
        file_bytes = resume_file.stream.read()
        
        # Delete old resume from Cloudinary if it exists (Cleanup during migration)
        old_resume = settings_collection.find_one({"key": "resume_url"})
        if old_resume and old_resume.get("public_id"):
            try:
                old_rt = old_resume.get("resource_type", "raw")
                cloudinary.uploader.destroy(old_resume["public_id"], resource_type=old_rt)
            except Exception as ex:
                app.logger.warning(f"Could not delete old resume from Cloudinary: {ex}")
                
        # Store resume natively in MongoDB for inline browser viewing support
        from bson.binary import Binary
        settings_collection.update_one(
            {"key": "resume_file_data"},
            {"$set": {
                "data": Binary(file_bytes),
                "filename": resume_file.filename,
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
        flash("Resume updated successfully!", "success")
    except Exception as e:
        traceback.print_exc()
        app.logger.error("Cloudinary upload failed (resume): %s", e)
        flash(f"Resume upload failed: {e}", "danger")
        
    return redirect(url_for("admin_resume"))

# -------------------------
# App run / DB init
# -------------------------
if __name__ == "__main__":
    is_debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(
        debug=is_debug,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000))
    )
