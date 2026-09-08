from flask import Blueprint, current_app, g, jsonify, make_response, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    set_refresh_cookies,
    unset_refresh_cookies,
)
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.user import User
from app.utils.authorization import authenticated_user_required, load_current_user


auth_bp = Blueprint("auth", __name__)
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 1024


def success_response(data, message, status_code=200):
    return jsonify({
        "success": True,
        "data": data,
        "message": message,
        "errors": None,
    }), status_code


def error_response(message, status_code, errors=None):
    return jsonify({
        "success": False,
        "data": None,
        "message": message,
        "errors": errors,
    }), status_code


def serialize_user(user):
    return {
        "id": user.id,
        "username": user.username,
        "fullName": user.full_name,
        "email": user.email,
        "departmentId": user.department_id,
        "role": user.role,
        "isActive": user.is_active,
    }


def register_jwt_error_handlers(jwt):
    @jwt.unauthorized_loader
    def handle_missing_token(_reason):
        return error_response(
            "Token xác thực không tồn tại hoặc không hợp lệ",
            401,
        )

    @jwt.invalid_token_loader
    def handle_invalid_token(_reason):
        return error_response("Token xác thực không hợp lệ", 401)

    @jwt.expired_token_loader
    def handle_expired_token(_header, _payload):
        return error_response("Token xác thực đã hết hạn", 401)

    @jwt.revoked_token_loader
    def handle_revoked_token(_header, _payload):
        return error_response("Token xác thực đã bị thu hồi", 401)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response(
            "Dữ liệu JSON không hợp lệ",
            400,
            {"body": "Request body phải là một JSON object"},
        )

    email = payload.get("email")
    username = payload.get("username")
    password = payload.get("password")
    validation_errors = {}

    has_email = isinstance(email, str) and bool(email.strip())
    has_username = isinstance(username, str) and bool(username.strip())
    if not has_email and not has_username:
        validation_errors["identifier"] = (
            "Email hoặc username là bắt buộc"
        )

    if not isinstance(password, str) or not password:
        validation_errors["password"] = "Mật khẩu là bắt buộc"
    elif len(password) > 1024:
        validation_errors["password"] = "Mật khẩu không hợp lệ"

    if validation_errors:
        return error_response(
            "Thông tin đăng nhập không hợp lệ",
            400,
            validation_errors,
        )

    if has_email:
        identifier = email.strip()
        user = User.query.filter(
            func.lower(User.email) == identifier.lower()
        ).first()
    else:
        identifier = username.strip()
        user = User.query.filter(
            func.lower(User.username) == identifier.lower()
        ).first()

    if not user or not user.check_password(password):
        return error_response(
            "Email/username hoặc mật khẩu không chính xác",
            401,
        )

    if user.is_active is not True:
        return error_response("Tài khoản đã bị vô hiệu hóa", 403)

    identity = str(user.id)
    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)
    response = make_response(jsonify({
        "success": True,
        "data": {
            "accessToken": access_token,
            "user": serialize_user(user),
        },
        "message": "Đăng nhập thành công",
        "errors": None,
    }), 200)
    set_refresh_cookies(response, refresh_token)
    return response


@auth_bp.post("/refresh")
@jwt_required(refresh=True, locations=["cookies"])
def refresh_access_token():
    user = load_current_user()
    if not user:
        return error_response("Tài khoản không còn tồn tại", 401)

    if user.is_active is not True:
        return error_response("Tài khoản đã bị vô hiệu hóa", 403)

    access_token = create_access_token(identity=str(user.id))
    return success_response(
        {"accessToken": access_token},
        "Làm mới access token thành công",
    )


@auth_bp.post("/logout")
def logout():
    response = make_response(jsonify({
        "success": True,
        "data": None,
        "message": "Đăng xuất thành công",
        "errors": None,
    }), 200)
    unset_refresh_cookies(response)
    return response


@auth_bp.get("/me")
@jwt_required(locations=["headers"])
def get_current_user():
    user = load_current_user()
    if not user:
        return error_response("Tài khoản không còn tồn tại", 401)

    if user.is_active is not True:
        return error_response("Tài khoản đã bị vô hiệu hóa", 403)

    return success_response(
        serialize_user(user),
        "Lấy thông tin người dùng thành công",
    )


@auth_bp.post("/change-password")
@authenticated_user_required
def change_password():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("Dữ liệu JSON không hợp lệ", 400)

    current_password = payload.get("currentPassword")
    new_password = payload.get("newPassword")
    confirm_password = payload.get("confirmPassword")
    validation_errors = {}

    if not isinstance(current_password, str) or not current_password:
        validation_errors["currentPassword"] = "Mật khẩu hiện tại là bắt buộc"
    if not isinstance(new_password, str) or not new_password:
        validation_errors["newPassword"] = "Mật khẩu mới là bắt buộc"
    elif len(new_password) < PASSWORD_MIN_LENGTH:
        validation_errors["newPassword"] = (
            f"Mật khẩu mới phải có ít nhất {PASSWORD_MIN_LENGTH} ký tự"
        )
    elif len(new_password) > PASSWORD_MAX_LENGTH:
        validation_errors["newPassword"] = (
            f"Mật khẩu mới không vượt quá {PASSWORD_MAX_LENGTH} ký tự"
        )
    if not isinstance(confirm_password, str) or confirm_password != new_password:
        validation_errors["confirmPassword"] = "Xác nhận mật khẩu không khớp"

    if validation_errors:
        return error_response(
            "Thông tin đổi mật khẩu không hợp lệ",
            400,
            validation_errors,
        )
    if not g.current_user.check_password(current_password):
        return error_response(
            "Mật khẩu hiện tại không chính xác",
            400,
            {"currentPassword": "Mật khẩu hiện tại không chính xác"},
        )

    g.current_user.set_password(new_password)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("Không thể đổi mật khẩu người dùng")
        return error_response("Không thể đổi mật khẩu", 500)

    return success_response(None, "Đổi mật khẩu thành công")
