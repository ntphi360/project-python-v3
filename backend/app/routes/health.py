from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    return jsonify({
        "success": True,
        "data": {
            "status": "ok"
        },
        "message": "API is running",
        "errors": None
    })