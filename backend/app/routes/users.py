from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import func, or_
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.department import Department
from app.models.user import User, UserRole
from app.utils.authorization import require_roles


users_bp = Blueprint("users", __name__)
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


def serialize_user(user, department_name=None):
    return {
        "id": user.id,
        "username": user.username,
        "fullName": user.full_name,
        "email": user.email,
        "phoneNumber": user.phone_number,
        "departmentId": user.department_id,
        "departmentName": department_name,
        "role": user.role,
        "isActive": user.is_active,
    }


def parse_positive_integer(name, default=None, maximum=None):
    raw_value = request.args.get(name)
    if raw_value is None:
        return default, None

    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return None, f"{name} phải là số nguyên dương"

    if value < 1 or (maximum is not None and value > maximum):
        suffix = f" và không vượt quá {maximum}" if maximum else ""
        return None, f"{name} phải là số nguyên dương{suffix}"

    return value, None


def normalize_required_text(value, field_name, maximum_length):
    if not isinstance(value, str) or not value.strip():
        return None, f"{field_name} là bắt buộc"

    normalized_value = value.strip()
    if len(normalized_value) > maximum_length:
        return None, f"{field_name} không vượt quá {maximum_length} ký tự"

    return normalized_value, None


def normalize_optional_text(value, field_name, maximum_length):
    if value is None or value == "":
        return None, None
    if not isinstance(value, str):
        return None, f"{field_name} không hợp lệ"

    normalized_value = value.strip()
    if len(normalized_value) > maximum_length:
        return None, f"{field_name} không vượt quá {maximum_length} ký tự"

    return normalized_value or None, None


def normalize_role(value):
    if not isinstance(value, str):
        return None, "Role không hợp lệ"

    role = value.strip().upper()
    if role not in UserRole.ALL:
        return None, "Role chỉ chấp nhận ADMIN, MANAGER hoặc OFFICER"

    return role, None


def validate_password(value, field_name="password"):
    if not isinstance(value, str) or not value:
        return f"{field_name} là bắt buộc"
    if len(value) < PASSWORD_MIN_LENGTH:
        return f"{field_name} phải có ít nhất {PASSWORD_MIN_LENGTH} ký tự"
    if len(value) > PASSWORD_MAX_LENGTH:
        return f"{field_name} không vượt quá {PASSWORD_MAX_LENGTH} ký tự"
    return None


def normalize_department_id(value):
    if value is None or value == "":
        return None, None
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        return None, "Phòng ban không hợp lệ"
    if db.session.get(Department, value) is None:
        return None, "Phòng ban không tồn tại"
    return value, None


def find_duplicate_user(username=None, email=None, excluded_user_id=None):
    conditions = []
    if username:
        conditions.append(func.lower(User.username) == username.lower())
    if email:
        conditions.append(func.lower(User.email) == email.lower())

    query = User.query.filter(or_(*conditions))
    if excluded_user_id is not None:
        query = query.filter(User.id != excluded_user_id)
    return query.first()


def commit_or_error(message):
    try:
        db.session.commit()
        return None
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception(message)
        return error_response(message, 500)


@users_bp.get("/users")
@require_roles(UserRole.ADMIN)
def get_users():
    page, page_error = parse_positive_integer("page", 1)
    page_size, page_size_error = parse_positive_integer(
        "pageSize",
        10,
        maximum=100,
    )
    department_id, department_error = parse_positive_integer("departmentId")
    validation_errors = {}

    if page_error:
        validation_errors["page"] = page_error
    if page_size_error:
        validation_errors["pageSize"] = page_size_error
    if department_error:
        validation_errors["departmentId"] = department_error

    role = request.args.get("role", "").strip().upper()
    if role and role not in UserRole.ALL:
        validation_errors["role"] = "Role không hợp lệ"

    is_active = request.args.get("isActive")
    parsed_is_active = None
    if is_active not in {None, ""}:
        if is_active.lower() not in {"true", "false"}:
            validation_errors["isActive"] = "isActive phải là true hoặc false"
        else:
            parsed_is_active = is_active.lower() == "true"

    if validation_errors:
        return error_response(
            "Tham số danh sách người dùng không hợp lệ",
            400,
            validation_errors,
        )

    keyword = request.args.get("keyword", "").strip()
    query = (
        db.session.query(
            User,
            Department.name.label("department_name"),
        )
        .outerjoin(Department, User.department_id == Department.id)
    )

    if keyword:
        pattern = f"%{keyword}%"
        query = query.filter(or_(
            User.username.ilike(pattern),
            User.full_name.ilike(pattern),
            User.email.ilike(pattern),
        ))
    if role:
        query = query.filter(User.role == role)
    if department_id is not None:
        query = query.filter(User.department_id == department_id)
    if parsed_is_active is not None:
        query = query.filter(User.is_active == parsed_is_active)

    try:
        pagination = query.order_by(User.id.desc()).paginate(
            page=page,
            per_page=page_size,
            error_out=False,
        )
    except SQLAlchemyError:
        current_app.logger.exception("Không thể lấy danh sách người dùng")
        return error_response("Không thể lấy danh sách người dùng", 500)

    return success_response({
        "items": [
            serialize_user(user, department_name)
            for user, department_name in pagination.items
        ],
        "pagination": {
            "page": pagination.page,
            "pageSize": pagination.per_page,
            "totalItems": pagination.total,
            "totalPages": pagination.pages,
            "hasNext": pagination.has_next,
            "hasPrev": pagination.has_prev,
        },
    }, "Lấy danh sách người dùng thành công")


@users_bp.post("/users")
@require_roles(UserRole.ADMIN)
def create_user():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("Dữ liệu JSON không hợp lệ", 400)

    username, username_error = normalize_required_text(
        payload.get("username"), "Username", 100
    )
    full_name, full_name_error = normalize_required_text(
        payload.get("fullName"), "Họ và tên", 255
    )
    email, email_error = normalize_required_text(
        payload.get("email"), "Email", 255
    )
    phone_number, phone_error = normalize_optional_text(
        payload.get("phoneNumber"), "Số điện thoại", 50
    )
    role, role_error = normalize_role(payload.get("role"))
    department_id, department_error = normalize_department_id(
        payload.get("departmentId")
    )
    password_error = validate_password(payload.get("password"))
    validation_errors = {
        key: value
        for key, value in {
            "username": username_error,
            "fullName": full_name_error,
            "email": email_error,
            "phoneNumber": phone_error,
            "role": role_error,
            "departmentId": department_error,
            "password": password_error,
        }.items()
        if value
    }

    if not username_error and not email_error:
        duplicate = find_duplicate_user(username=username, email=email)
        if duplicate:
            if duplicate.username and duplicate.username.lower() == username.lower():
                validation_errors["username"] = "Username đã tồn tại"
            if duplicate.email and duplicate.email.lower() == email.lower():
                validation_errors["email"] = "Email đã tồn tại"

    if validation_errors:
        return error_response(
            "Dữ liệu người dùng không hợp lệ",
            400,
            validation_errors,
        )

    user = User(
        username=username,
        full_name=full_name,
        email=email,
        phone_number=phone_number,
        department_id=department_id,
        role=role,
        is_active=True,
    )
    user.set_password(payload["password"])
    db.session.add(user)
    database_error = commit_or_error("Không thể tạo người dùng")
    if database_error:
        return database_error

    department = (
        db.session.get(Department, user.department_id)
        if user.department_id
        else None
    )
    return success_response(
        serialize_user(user, department.name if department else None),
        "Tạo người dùng thành công",
        201,
    )


@users_bp.patch("/users/<int:user_id>")
@require_roles(UserRole.ADMIN)
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return error_response("Không tìm thấy người dùng", 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("Dữ liệu JSON không hợp lệ", 400)

    allowed_fields = {
        "username", "fullName", "email", "phoneNumber", "departmentId"
    }
    forbidden_fields = {"password", "passwordHash", "role", "isActive"}
    if forbidden_fields.intersection(payload):
        return error_response(
            "Dữ liệu người dùng không hợp lệ",
            400,
            {"fields": "Role, trạng thái và mật khẩu phải dùng endpoint riêng"},
        )
    if not allowed_fields.intersection(payload):
        return error_response(
            "Không có thông tin người dùng cần cập nhật",
            400,
        )

    changes = {}
    validation_errors = {}
    text_fields = {
        "username": ("username", "Username", 100, True),
        "fullName": ("full_name", "Họ và tên", 255, True),
        "email": ("email", "Email", 255, True),
        "phoneNumber": ("phone_number", "Số điện thoại", 50, False),
    }
    for request_field, (model_field, label, maximum, required) in text_fields.items():
        if request_field not in payload:
            continue
        normalizer = normalize_required_text if required else normalize_optional_text
        value, field_error = normalizer(payload[request_field], label, maximum)
        if field_error:
            validation_errors[request_field] = field_error
        else:
            changes[model_field] = value

    if "departmentId" in payload:
        department_id, department_error = normalize_department_id(
            payload["departmentId"]
        )
        if department_error:
            validation_errors["departmentId"] = department_error
        else:
            changes["department_id"] = department_id

    duplicate = find_duplicate_user(
        username=changes.get("username"),
        email=changes.get("email"),
        excluded_user_id=user.id,
    ) if changes.get("username") or changes.get("email") else None
    if duplicate:
        if (
            changes.get("username")
            and duplicate.username
            and duplicate.username.lower() == changes["username"].lower()
        ):
            validation_errors["username"] = "Username đã tồn tại"
        if (
            changes.get("email")
            and duplicate.email
            and duplicate.email.lower() == changes["email"].lower()
        ):
            validation_errors["email"] = "Email đã tồn tại"

    if validation_errors:
        return error_response(
            "Dữ liệu người dùng không hợp lệ",
            400,
            validation_errors,
        )

    for field_name, value in changes.items():
        setattr(user, field_name, value)

    database_error = commit_or_error("Không thể cập nhật người dùng")
    if database_error:
        return database_error

    department = (
        db.session.get(Department, user.department_id)
        if user.department_id
        else None
    )
    return success_response(
        serialize_user(user, department.name if department else None),
        "Cập nhật người dùng thành công",
    )


@users_bp.patch("/users/<int:user_id>/role")
@require_roles(UserRole.ADMIN)
def change_user_role(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return error_response("Không tìm thấy người dùng", 404)

    payload = request.get_json(silent=True)
    role, role_error = normalize_role(
        payload.get("role") if isinstance(payload, dict) else None
    )
    if role_error:
        return error_response(
            "Role không hợp lệ",
            400,
            {"role": role_error},
        )
    if user.id == g.current_user.id and role != UserRole.ADMIN:
        return error_response(
            "Không thể tự hạ quyền tài khoản ADMIN hiện tại",
            409,
        )

    user.role = role
    database_error = commit_or_error("Không thể thay đổi role người dùng")
    if database_error:
        return database_error
    return success_response(
        serialize_user(user),
        "Thay đổi role người dùng thành công",
    )


@users_bp.patch("/users/<int:user_id>/status")
@require_roles(UserRole.ADMIN)
def change_user_status(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return error_response("Không tìm thấy người dùng", 404)

    payload = request.get_json(silent=True)
    is_active = payload.get("isActive") if isinstance(payload, dict) else None
    if not isinstance(is_active, bool):
        return error_response(
            "Trạng thái người dùng không hợp lệ",
            400,
            {"isActive": "isActive phải là boolean"},
        )
    if user.id == g.current_user.id and not is_active:
        return error_response(
            "Không thể tự khóa tài khoản ADMIN hiện tại",
            409,
        )

    user.is_active = is_active
    database_error = commit_or_error("Không thể thay đổi trạng thái người dùng")
    if database_error:
        return database_error
    return success_response(
        serialize_user(user),
        "Thay đổi trạng thái người dùng thành công",
    )


@users_bp.post("/users/<int:user_id>/reset-password")
@require_roles(UserRole.ADMIN)
def reset_user_password(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return error_response("Không tìm thấy người dùng", 404)

    payload = request.get_json(silent=True)
    new_password = payload.get("newPassword") if isinstance(payload, dict) else None
    confirm_password = (
        payload.get("confirmPassword") if isinstance(payload, dict) else None
    )
    validation_errors = {}
    password_error = validate_password(new_password, "Mật khẩu mới")
    if password_error:
        validation_errors["newPassword"] = password_error
    if not isinstance(confirm_password, str) or confirm_password != new_password:
        validation_errors["confirmPassword"] = "Xác nhận mật khẩu không khớp"

    if validation_errors:
        return error_response(
            "Mật khẩu mới không hợp lệ",
            400,
            validation_errors,
        )

    user.set_password(new_password)
    database_error = commit_or_error("Không thể đặt lại mật khẩu")
    if database_error:
        return database_error
    return success_response(None, "Đặt lại mật khẩu thành công")
