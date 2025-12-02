# app_fixed.py
import os
import pymysql
pymysql.install_as_MySQLdb()

from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, jsonify, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, TextAreaField
from wtforms.validators import Email, DataRequired, Length
from werkzeug.security import generate_password_hash, check_password_hash

# -------------------------
# Configuration
# -------------------------
app = Flask(__name__)

# Use environment variables in production (Vercel)
# Example for a remote MySQL database: mysql+pymysql://user:password@host:3306/dbname
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'sqlite:///database.db'  # local fallback for development
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Session and secret key
app.secret_key = os.environ.get('SECRET_KEY', 'replace-this-with-env-secret-in-prod')
app.permanent_session_lifetime = timedelta(minutes=int(os.environ.get('SESSION_MINUTES', '10')))

# Optional MySQL config keys (kept for compatibility; not required if using SQLAlchemy DB URL)
app.config['MYSQL_HOST'] = os.environ.get('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER'] = os.environ.get('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD', '')
app.config['MYSQL_DB'] = os.environ.get('MYSQL_DB', '')

# Important: enable CSRF protection via Flask-WTF default
# Make sure you set SECRET_KEY in environment for production

db = SQLAlchemy(app)

# -------------------------
# Models
# -------------------------
class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved = db.Column(db.Boolean, default=False)

class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

# -------------------------
# Forms
# -------------------------
class RegisterForm(FlaskForm):
    name = StringField("Name", validators=[DataRequired()])
    email = StringField("Email", validators=[DataRequired(), Email()])
    password = PasswordField("Password", validators=[DataRequired(), Length(min=6)])
    submit = SubmitField('Register')

class LoginForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired()])
    password = PasswordField("Password", validators=[DataRequired()])
    submit = SubmitField("Login")

class CommentForm(FlaskForm):
    name = StringField("Name", validators=[DataRequired()])
    email = StringField("Email", validators=[DataRequired(), Email()])
    message = TextAreaField("Message", validators=[DataRequired(), Length(max=2000)])
    submit = SubmitField("Submit")

# -------------------------
# Helper: ensure default admin exists (from env)
# -------------------------
def ensure_default_admin():
    """
    Create an admin from environment variables if provided.
    If no env admin exists and no Admin record exists, and FLASK_DEBUG=1,
    create a convenient dev admin (atharva7471 / 1004) for local development only.
    """
    admin_user = os.environ.get('ADMIN_USERNAME')
    admin_pass = os.environ.get('ADMIN_PASSWORD')

    existing_any = Admin.query.first()

    if admin_user and admin_pass:
        existing = Admin.query.filter_by(username=admin_user).first()
        if not existing:
            a = Admin(username=admin_user)
            a.set_password(admin_pass)
            db.session.add(a)
            db.session.commit()
            app.logger.info("Created default admin from environment variables.")
        return

    if existing_any:
        return

    # DEV fallback: create a dev admin only when debug mode is on
    if os.environ.get('FLASK_DEBUG', '1') == '1':
        dev_user = os.environ.get('DEV_ADMIN_USERNAME', 'atharva7471')
        dev_pass = os.environ.get('DEV_ADMIN_PASSWORD', '1004')
        if not Admin.query.filter_by(username=dev_user).first():
            a = Admin(username=dev_user)
            a.set_password(dev_pass)
            db.session.add(a)
            db.session.commit()
            app.logger.info("Created development admin: %s (FLASK_DEBUG=1)", dev_user)

# -------------------------
# Routes
# -------------------------
@app.route('/')
def home():
    # Show only approved comments on public site
    comments = Comment.query.filter_by(approved=True).order_by(Comment.created_at.desc()).all()
    form = CommentForm()
    return render_template('index.html', comments=comments, form=form)

@app.route('/submit', methods=['POST'])
def submit():
    # Accept AJAX or form POST
    name = request.form.get("name")
    email = request.form.get("email")
    message = request.form.get("message")

    if not (name and email and message):
        return jsonify({"success": False, "message": "Please fill all fields."}), 400

    new_comment = Comment(name=name, email=email, message=message)
    db.session.add(new_comment)
    db.session.commit()
    return jsonify({"success": True, "message": "Comment submitted successfully!"}), 201

@app.route('/comments', methods=['GET'])
def get_comments():
    comments = Comment.query.filter_by(approved=True).order_by(Comment.created_at.desc()).all()
    comments_list = [
        {
            "id": c.id,
            "name": c.name,
            "message": c.message,
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for c in comments
    ]
    return jsonify(comments_list)

# -------------------------
# Admin: Login / Logout / Dashboard
# -------------------------
def is_admin_logged_in() -> bool:
    return bool(session.get('admin'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()

    # Try WTForms validation first (proper flow)
    if form.validate_on_submit():
        username = form.username.data.strip()
        password = form.password.data
    else:
        username = None
        password = None
        # If POST and WTForms failed, try raw POST values (helps if CSRF token missing in template)
        if request.method == 'POST':
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')
            app.logger.debug("login: falling back to raw POST data username=%s", username)

    # Only attempt login when we have credentials
    if username and password:
        # Try DB admin first
        admin_obj = Admin.query.filter_by(username=username).first()
        if admin_obj and admin_obj.check_password(password):
            session.permanent = True
            session['admin'] = True
            session['admin_username'] = admin_obj.username
            flash('Login successful!', 'success')
            return redirect(url_for('admin_dashboard'))

        # Fallback to environment credentials (useful for ephemeral DBs)
        env_user = os.environ.get('ADMIN_USERNAME')
        env_pass = os.environ.get('ADMIN_PASSWORD')
        if env_user and env_pass and username == env_user and password == env_pass:
            session.permanent = True
            session['admin'] = True
            session['admin_username'] = env_user
            flash('Login successful (env credentials)!', 'success')
            return redirect(url_for('admin_dashboard'))

        # failed
        app.logger.debug("login failed for username=%s", username)
        flash('Invalid username or password!', 'danger')

    return render_template('login.html', form=form)

@app.route('/logout')
def logout():
    session.pop('admin', None)
    session.pop('admin_username', None)
    flash('Logged out successfully', 'info')
    return redirect(url_for('login'))

@app.route('/admin')
def admin_dashboard():
    if not is_admin_logged_in():
        return redirect(url_for('login'))

    search_query = request.args.get('q', '').strip()

    if search_query:
        comments = Comment.query.filter(
            (Comment.name.ilike(f"%{search_query}%")) |
            (Comment.message.ilike(f"%{search_query}%"))
        ).order_by(Comment.created_at.desc()).all()
    else:
        comments = Comment.query.order_by(Comment.created_at.desc()).all()

    return render_template('admin.html', comments=comments, search_query=search_query, datetime=datetime)

@app.route('/toggle_approval/<int:comment_id>', methods=['POST'])
def toggle_approval(comment_id):
    if not is_admin_logged_in():
        return redirect(url_for('login'))

    comment = Comment.query.get_or_404(comment_id)
    comment.approved = not comment.approved
    db.session.commit()
    if comment.approved:
        flash(f'Comment by {comment.name} approved.', 'success')
    else:
        flash(f'Comment by {comment.name} hidden.', 'info')
    return redirect(url_for('admin_dashboard'))

@app.route('/delete/<int:comment_id>', methods=['POST', 'GET'])
def delete_comment(comment_id):
    if not is_admin_logged_in():
        return redirect(url_for('login'))

    comment = Comment.query.get_or_404(comment_id)
    db.session.delete(comment)
    db.session.commit()
    flash('Comment deleted successfully.', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/register', methods=['GET', 'POST'])
def admin_register():
    # Only allow existing admin to create another admin
    if not is_admin_logged_in():
        return redirect(url_for('login'))

    form = RegisterForm()
    if form.validate_on_submit():
        username = form.name.data.strip()
        password = form.password.data
        # Ensure unique username
        if Admin.query.filter_by(username=username).first():
            flash('Admin username already exists.', 'danger')
            return redirect(url_for('admin_register'))

        new_admin = Admin(username=username)
        new_admin.set_password(password)
        db.session.add(new_admin)
        db.session.commit()
        flash('New admin created successfully.', 'success')
        return redirect(url_for('admin_dashboard'))

    return render_template('admin_register.html', form=form)

# Debug route (local only) to inspect admins and env vars
@app.route('/_debug_admins')
def _debug_admins():
    if os.environ.get('FLASK_DEBUG', '1') != '1':
        return jsonify({'error': 'debug only'}), 403
    admins = [a.username for a in Admin.query.all()]
    return jsonify({
        'admins': admins,
        'env_ADMIN_USERNAME': os.environ.get('ADMIN_USERNAME'),
        'env_ADMIN_PASSWORD_set': bool(os.environ.get('ADMIN_PASSWORD'))
    })

# -------------------------
# App run / DB init
# -------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        ensure_default_admin()

    app.run(debug=os.environ.get('FLASK_DEBUG', '1') == '1', host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
