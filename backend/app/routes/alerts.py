from math import ceil

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import or_

from app.extensions import db
from app.models.case import Case
from app.models.department import Department
from app.models.notification import Notification
from app.models.procedure import Procedure
from app.models.user import User
from app.services.alert_service import (
    ALERT_LABELS,
    active_alert_query,
    build_alert_item,
    current_time,
)


alerts_bp = Blueprint("alerts", __name__)
REMINDER_CHANNELS = {"SYSTEM", "EMAIL", "ZALO"}


def error_response(message, status_code, errors=None):
    return jsonify({
        "success": False,
        "data": None,
        "message": message,
        "errors": errors,
    }), status_code


def parse_positive_integer(name, default, maximum=None):
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


@alerts_bp.get("/alerts")
def get_alerts():
    page, page_error = parse_positive_integer("page", 1)
    page_size, page_size_error = parse_positive_integer(
        "pageSize",
        10,
        maximum=100,
    )

    validation_errors = {}
    if page_error:
        validation_errors["page"] = page_error
    if page_size_error:
        validation_errors["pageSize"] = page_size_error

    alert_type = request.args.get("alertType", "").strip().upper()
    if alert_type and alert_type not in ALERT_LABELS:
        validation_errors["alertType"] = "Loại cảnh báo không hợp lệ"

    if validation_errors:
        return error_response(
            "Tham số lọc cảnh báo không hợp lệ",
            400,
            validation_errors,
        )

    keyword = request.args.get("keyword", "").strip()
    department = request.args.get("department", "").strip()
    assignee = request.args.get("assignee", "").strip()
    now = current_time()
    query = active_alert_query(now)

    if keyword:
        pattern = f"%{keyword}%"
        query = query.filter(or_(
            Case.external_case_code.ilike(pattern),
            Case.applicant_name.ilike(pattern),
            Case.procedure.has(Procedure.name.ilike(pattern)),
            Case.current_assignee.has(User.full_name.ilike(pattern)),
        ))

    if department:
        query = query.filter(
            Case.department.has(Department.name.ilike(f"%{department}%"))
        )

    if assignee:
        query = query.filter(
            Case.current_assignee.has(User.full_name.ilike(f"%{assignee}%"))
        )

    alert_items = [
        item
        for case in query.order_by(Case.due_at.asc()).all()
        if (item := build_alert_item(case, now)) is not None
    ]

    if alert_type:
        alert_items = [
            item
            for item in alert_items
            if item["alertType"] == alert_type
        ]

    summary = {
        "total": len(alert_items),
        "nearDue": sum(
            item["alertType"] == "NEAR_DUE"
            for item in alert_items
        ),
        "dueToday": sum(
            item["alertType"] == "DUE_TODAY"
            for item in alert_items
        ),
        "overdue": sum(
            item["alertType"] == "OVERDUE"
            for item in alert_items
        ),
    }

    total_items = len(alert_items)
    start = (page - 1) * page_size
    items = alert_items[start:start + page_size]

    return jsonify({
        "success": True,
        "data": {
            "summary": summary,
            "items": items,
            "pagination": {
                "page": page,
                "pageSize": page_size,
                "totalItems": total_items,
                "totalPages": ceil(total_items / page_size),
                "hasNext": start + page_size < total_items,
                "hasPrev": page > 1,
            },
        },
        "message": "Lấy danh sách cảnh báo thành công",
        "errors": None,
    }), 200


@alerts_bp.post("/alerts/<int:case_id>/remind")
def send_case_reminder(case_id):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response(
            "Dữ liệu JSON không hợp lệ",
            400,
            {"body": "Request body phải là một JSON object"},
        )

    message = payload.get("message")
    if not isinstance(message, str) or not message.strip():
        return error_response(
            "Nội dung nhắc nhở không hợp lệ",
            400,
            {"message": "Nội dung nhắc nhở không được để trống"},
        )

    message = message.strip()
    if len(message) > 2000:
        return error_response(
            "Nội dung nhắc nhở không hợp lệ",
            400,
            {"message": "Nội dung nhắc nhở không vượt quá 2000 ký tự"},
        )

    channels = payload.get("channels")
    if not isinstance(channels, list) or not channels:
        return error_response(
            "Kênh gửi nhắc nhở không hợp lệ",
            400,
            {"channels": "Phải chọn ít nhất một kênh gửi"},
        )

    if (
        any(not isinstance(channel, str) for channel in channels)
        or len(set(channels)) != len(channels)
        or any(channel not in REMINDER_CHANNELS for channel in channels)
    ):
        return error_response(
            "Kênh gửi nhắc nhở không hợp lệ",
            400,
            {
                "channels": (
                    "channels chỉ chấp nhận các giá trị duy nhất: "
                    "SYSTEM, EMAIL, ZALO"
                )
            },
        )

    case = db.session.get(Case, case_id)
    if not case:
        return error_response(
            "Không tìm thấy hồ sơ",
            404,
            {"caseId": case_id},
        )

    if build_alert_item(case, current_time()) is None:
        return error_response(
            "Hồ sơ hiện không thuộc danh sách cảnh báo",
            409,
            {"caseId": case_id},
        )

    if not case.current_assignee_id or not case.current_assignee:
        return error_response(
            "Hồ sơ chưa có cán bộ phụ trách",
            400,
            {"assigneeId": "Không thể xác định người nhận"},
        )

    results = {}

    if "SYSTEM" in channels:
        notification = Notification(
            receiver_user_id=case.current_assignee_id,
            sender_user_id=None,
            case_id=case.id,
            type=Notification.CASE_REMINDER,
            title="Nhắc nhở xử lý hồ sơ",
            message=message,
            is_read=False,
            created_at=current_time(),
        )

        try:
            db.session.add(notification)
            db.session.commit()
            results["SYSTEM"] = {
                "success": True,
                "notificationId": notification.id,
            }
        except Exception:
            db.session.rollback()
            current_app.logger.exception(
                "Không thể gửi thông báo hệ thống cho hồ sơ id=%s",
                case_id,
            )
            results["SYSTEM"] = {
                "success": False,
                "error": "Không thể tạo thông báo trong hệ thống",
            }

    if "EMAIL" in channels:
        results["EMAIL"] = {
            "success": False,
            "error": "Email service chưa được cấu hình",
        }

    if "ZALO" in channels:
        results["ZALO"] = {
            "success": False,
            "error": "Zalo service chưa được cấu hình",
        }

    successful_channels = [
        channel
        for channel, result in results.items()
        if result["success"]
    ]
    all_channels_succeeded = len(successful_channels) == len(channels)

    if all_channels_succeeded:
        response_message = "Gửi nhắc nhở thành công"
    elif successful_channels:
        response_message = "Đã xử lý gửi nhắc nhở, một số kênh thất bại"
    else:
        response_message = "Không gửi được nhắc nhở qua các kênh đã chọn"

    return jsonify({
        "success": all_channels_succeeded,
        "data": {
            "caseId": case.id,
            "results": results,
        },
        "message": response_message,
        "errors": None,
    }), 200
