import os
from datetime import timedelta
from urllib.parse import quote_plus

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_migrate import upgrade

from app.extensions import db
from app.extensions import jwt
from app.extensions import migrate
from app.cli import register_cli_commands
from app.routes.auth import auth_bp, register_jwt_error_handlers
from app.routes.health import health_bp
from app.routes.cases import cases_bp
from app.routes.imports import imports_bp
from app.routes.dashboard import dashboard_bp
from app.routes.alerts import alerts_bp
from app.routes.catalogs import catalogs_bp
from app.routes.notifications import notifications_bp
from app.routes.users import users_bp


def get_positive_int_env(name, default):
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    try:
        value = int(raw_value)
    except ValueError as error:
        raise RuntimeError(f"{name} phải là số nguyên dương") from error

    if value < 1:
        raise RuntimeError(f"{name} phải là số nguyên dương")

    return value


def get_bool_env(name, default=False):
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    normalized_value = raw_value.strip().lower()
    if normalized_value in {"true", "1", "yes"}:
        return True
    if normalized_value in {"false", "0", "no"}:
        return False

    raise RuntimeError(f"{name} phải là true hoặc false")


def get_cookie_samesite():
    raw_value = os.getenv("JWT_COOKIE_SAMESITE", "Lax").strip().lower()
    values = {"lax": "Lax", "strict": "Strict", "none": "None"}
    if raw_value not in values:
        raise RuntimeError(
            "JWT_COOKIE_SAMESITE phải là Lax, Strict hoặc None"
        )

    return values[raw_value]


def get_cors_origins():
    raw_value = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    origins = [
        origin.strip()
        for origin in raw_value.split(",")
        if origin.strip()
    ]
    if not origins or "*" in origins:
        raise RuntimeError(
            "CORS_ORIGINS phải chứa origin cụ thể khi dùng cookie"
        )

    return origins



def create_app():
    load_dotenv()

    app = Flask(__name__)

    app.json.ensure_ascii = False

    # connect database
    connection_string = (
        f"DRIVER={{{os.getenv('DB_DRIVER')}}};"
        f"SERVER={os.getenv('DB_SERVER')};"
        f"DATABASE={os.getenv('DB_NAME')};"
        f"UID={os.getenv('DB_USER')};"
        f"PWD={os.getenv('DB_PASSWORD')};"
        f"TrustServerCertificate=yes;"
    )

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        "mssql+pyodbc:///?odbc_connect="
        + quote_plus(connection_string)
    )

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    jwt_secret = os.getenv("JWT_SECRET_KEY")
    if not jwt_secret:
        raise RuntimeError("JWT_SECRET_KEY chưa được cấu hình")

    cookie_secure = get_bool_env("JWT_COOKIE_SECURE")
    cookie_samesite = get_cookie_samesite()
    if cookie_samesite == "None" and not cookie_secure:
        raise RuntimeError(
            "JWT_COOKIE_SECURE phải là true khi "
            "JWT_COOKIE_SAMESITE=None"
        )

    app.config.update(
        JWT_SECRET_KEY=jwt_secret,
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(
            minutes=get_positive_int_env(
                "JWT_ACCESS_TOKEN_MINUTES",
                20,
            )
        ),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(
            days=get_positive_int_env(
                "JWT_REFRESH_TOKEN_DAYS",
                7,
            )
        ),
        JWT_TOKEN_LOCATION=["headers", "cookies"],
        JWT_COOKIE_SECURE=cookie_secure,
        JWT_COOKIE_SAMESITE=cookie_samesite,
        JWT_REFRESH_COOKIE_NAME="refresh_token_cookie",
        JWT_REFRESH_COOKIE_PATH="/api/auth",
        JWT_COOKIE_CSRF_PROTECT=True,
        JWT_CSRF_IN_COOKIES=True,
        JWT_REFRESH_CSRF_COOKIE_NAME="csrf_refresh_token",
        JWT_REFRESH_CSRF_COOKIE_PATH="/",
        JWT_REFRESH_CSRF_HEADER_NAME="X-CSRF-TOKEN",
        JWT_SESSION_COOKIE=False,
    )

    db.init_app(app)
    migrate.init_app(app, db)  # Migrate schema database
    jwt.init_app(app)
    register_jwt_error_handlers(jwt)
    register_cli_commands(app)
    with app.app_context():
        upgrade()

    CORS(
        app,
        resources={r"/api/*": {"origins": get_cors_origins()}},
        supports_credentials=True,
    )

    # register routes
    app.register_blueprint(
        health_bp,
        url_prefix="/api/v1"
    )

    app.register_blueprint(
        cases_bp,
        url_prefix="/api/v1"
    )

    app.register_blueprint(
        imports_bp,
        url_prefix="/api/v1"
    )

    app.register_blueprint(
        dashboard_bp,
        url_prefix="/api/v1"
    )

    app.register_blueprint(
        alerts_bp,
        url_prefix="/api/v1"
    )

    app.register_blueprint(
        catalogs_bp,
        url_prefix="/api/v1"
    )

    app.register_blueprint(
        notifications_bp,
        url_prefix="/api/v1"
    )

    app.register_blueprint(
        users_bp,
        url_prefix="/api/v1"
    )

    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )

    return app
