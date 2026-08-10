import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from app.extensions import db
from app.routes.health import health_bp
from app.routes.cases import cases_bp


def create_app():
    load_dotenv()

    app = Flask(__name__)

    app.json.ensure_ascii = False

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

    db.init_app(app)

    CORS(app)

    app.register_blueprint(
        health_bp,
        url_prefix="/api/v1"
    )

    app.register_blueprint(
        cases_bp,
        url_prefix="/api/v1"
    )

    return app