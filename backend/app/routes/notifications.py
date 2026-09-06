from flask import Blueprint, current_app, jsonify, request

from app.extensions import db
from app.models.notification import Notification
from app.models.user import User


notifications_bp = Blueprint("notifications", __name__)


def error_response(message, status_code, errors=None):
    return jsonify({
        "success": False,
        "data": None,
        "message": message,
        "errors": errors,
    }), status_code


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


def serialize_notification(notification):
    return {
        "id": notification.id,
        "receiverUserId": notification.receiver_user_id,
        "senderUserId": notification.sender_user_id,
        "caseId": notification.case_id,
        "caseCode": (
            notification.case.external_case_code
            if notification.case
            else None
        ),
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "isRead": notification.is_read,
        "createdAt": notification.created_at.isoformat(),
    }


@notifications_bp.get("/notifications")
def get_notifications():
    receiver_user_id, receiver_error = parse_positive_integer(
        "receiverUserId"
    )
    page, page_error = parse_positive_integer("page", 1)
    page_size, page_size_error = parse_positive_integer(
        "pageSize",
        20,
        maximum=100,
    )

    errors = {}
    if receiver_error or receiver_user_id is None:
        errors["receiverUserId"] = (
            receiver_error or "receiverUserId là bắt buộc"
        )
    if page_error:
        errors["page"] = page_error
    if page_size_error:
        errors["pageSize"] = page_size_error

    is_read = request.args.get("isRead")
    parsed_is_read = None
    if is_read is not None:
        if is_read.lower() not in {"true", "false"}:
            errors["isRead"] = "isRead phải là true hoặc false"
        else:
            parsed_is_read = is_read.lower() == "true"

    if errors:
        return error_response(
            "Tham số danh sách thông báo không hợp lệ",
            400,
            errors,
        )

    if db.session.get(User, receiver_user_id) is None:
        return error_response(
            "Không tìm thấy người nhận thông báo",
            404,
            {"receiverUserId": receiver_user_id},
        )

    query = Notification.query.filter(
        Notification.receiver_user_id == receiver_user_id
    )
    if parsed_is_read is not None:
        query = query.filter(Notification.is_read == parsed_is_read)

    pagination = query.order_by(
        Notification.created_at.desc(),
        Notification.id.desc(),
    ).paginate(
        page=page,
        per_page=page_size,
        error_out=False,
    )

    return jsonify({
        "success": True,
        "data": {
            "items": [
                serialize_notification(notification)
                for notification in pagination.items
            ],
            "pagination": {
                "page": pagination.page,
                "pageSize": pagination.per_page,
                "totalItems": pagination.total,
                "totalPages": pagination.pages,
                "hasNext": pagination.has_next,
                "hasPrev": pagination.has_prev,
            },
        },
        "message": "Lấy danh sách thông báo thành công",
        "errors": None,
    }), 200


@notifications_bp.patch("/notifications/<int:notification_id>/read")
def mark_notification_read(notification_id):
    payload = request.get_json(silent=True)
    receiver_user_id = (
        payload.get("receiverUserId")
        if isinstance(payload, dict)
        else None
    )
    if isinstance(receiver_user_id, bool) or not isinstance(receiver_user_id, int):
        return error_response(
            "Dữ liệu thông báo không hợp lệ",
            400,
            {"receiverUserId": "receiverUserId là bắt buộc"},
        )

    notification = db.session.get(Notification, notification_id)
    if (
        not notification
        or notification.receiver_user_id != receiver_user_id
    ):
        return error_response("Không tìm thấy thông báo", 404)

    try:
        notification.is_read = True
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Không thể đánh dấu thông báo id=%s là đã đọc",
            notification_id,
        )
        return error_response(
            "Không thể cập nhật trạng thái thông báo",
            500,
        )

    return jsonify({
        "success": True,
        "data": serialize_notification(notification),
        "message": "Đã đánh dấu thông báo là đã đọc",
        "errors": None,
    }), 200
