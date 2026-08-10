from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db


health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    return jsonify({
        "success": True,
        "message": "API đang hoạt động"
    }), 200


@health_bp.get("/db-health")
def db_health():
    db.session.execute(text("SELECT 1"))

    return jsonify({
        "success": True,
        "message": "Kết nối SQL Server thành công"
    }), 200