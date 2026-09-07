from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.extensions import db
from app.models.user import User, UserRole


def authorization_error(message, status_code):
    return jsonify({
        "success": False,
        "data": None,
        "message": message,
        "errors": None,
    }), status_code


def load_current_user():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    return db.session.get(User, user_id)


def authenticate_current_user():
    verify_jwt_in_request(locations=["headers"])
    user = load_current_user()

    if not user:
        return authorization_error("Tài khoản không còn tồn tại", 401)
    if user.is_active is not True:
        return authorization_error("Tài khoản đã bị vô hiệu hóa", 403)

    g.current_user = user
    return None


def authenticated_user_required(view_function):
    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        authentication_error = authenticate_current_user()
        if authentication_error:
            return authentication_error
        return view_function(*args, **kwargs)

    return wrapped_view


def require_roles(*allowed_roles):
    unknown_roles = set(allowed_roles) - UserRole.ALL
    if unknown_roles:
        raise ValueError(f"Role không hợp lệ: {', '.join(sorted(unknown_roles))}")

    allowed_role_set = set(allowed_roles)

    def decorator(view_function):
        @wraps(view_function)
        def wrapped_view(*args, **kwargs):
            authentication_error = authenticate_current_user()
            if authentication_error:
                return authentication_error
            if g.current_user.role not in allowed_role_set:
                return authorization_error(
                    "Bạn không có quyền thực hiện chức năng này",
                    403,
                )
            return view_function(*args, **kwargs)

        return wrapped_view

    return decorator
