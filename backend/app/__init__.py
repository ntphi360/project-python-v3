from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "http://localhost:5173"
            }
        }
    )

    from app.routes.health import health_bp

    app.register_blueprint(
        health_bp,
        url_prefix="/api/v1"
    )

    return app