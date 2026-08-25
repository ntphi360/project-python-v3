from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import or_
from datetime import datetime

from app.extensions import db
from app.models.case import Case
from app.models.department import Department
from app.models.procedure import Procedure
from app.models.user import User


cases_bp = Blueprint("cases", __name__)

DATETIME_FIELDS = {
    "receivedAt": "received_at",
    "appointmentDate": "appointment_date",
    "dueAt": "due_at",
    "completedAt": "completed_at",
}

FOREIGN_KEY_FIELDS = {
    "procedureId": ("procedure_id", Procedure, "Thủ tục hành chính"),
    "departmentId": ("department_id", Department, "Phòng ban"),
    "assigneeId": ("current_assignee_id", User, "Người xử lý"),
}

TEXT_FIELDS = {
    "applicantName": "applicant_name",
    "applicantPhone": "applicant_phone",
    "agencyName": "agency_name",
    "status": "status",
    "priority": "priority",
    "currentStepName": "current_step_name",
    "sourceType": "source_type",
}


def error_response(message, status_code, errors=None):
    return jsonify({
        "success": False,
        "data": None,
        "message": message,
        "errors": errors,
    }), status_code


def parse_datetime(value, field_name):
    if value is None:
        return None, None

    if not isinstance(value, str) or not value.strip():
        return None, f"{field_name} phải là datetime ISO hợp lệ hoặc null"

    try:
        return datetime.fromisoformat(value.strip()), None
    except ValueError:
        return None, f"{field_name} phải là datetime ISO hợp lệ hoặc null"


def validate_case_code(value, case_id=None):
    if not isinstance(value, str) or not value.strip():
        return None, "caseCode là bắt buộc và không được để trống"

    case_code = value.strip()
    duplicate_query = Case.query.filter(
        Case.external_case_code == case_code
    )

    if case_id is not None:
        duplicate_query = duplicate_query.filter(
            Case.id != case_id
        )

    if duplicate_query.first():
        return None, "caseCode đã tồn tại"

    return case_code, None


def validate_foreign_key(value, model, label):
    if value is None:
        return None

    if isinstance(value, bool) or not isinstance(value, int):
        return f"{label} không hợp lệ"

    if db.session.get(model, value) is None:
        return f"{label} không tồn tại"

    return None


def validate_case_fields(case, payload, is_create=False):
    errors = {}
    changes = {}

    if is_create or "caseCode" in payload:
        case_code, case_code_error = validate_case_code(
            payload.get("caseCode"),
            None if is_create else case.id
        )
        if case_code_error:
            errors["caseCode"] = case_code_error
        else:
            changes["external_case_code"] = case_code

    for request_field, (model_field, model, label) in FOREIGN_KEY_FIELDS.items():
        if request_field not in payload:
            continue

        value = payload[request_field]
        foreign_key_error = validate_foreign_key(value, model, label)
        if foreign_key_error:
            errors[request_field] = foreign_key_error
        else:
            changes[model_field] = value

    for request_field, model_field in DATETIME_FIELDS.items():
        if request_field not in payload:
            continue

        value, datetime_error = parse_datetime(
            payload[request_field],
            request_field
        )
        if datetime_error:
            errors[request_field] = datetime_error
        else:
            changes[model_field] = value

    for request_field, model_field in TEXT_FIELDS.items():
        if request_field in payload:
            changes[model_field] = payload[request_field]

    return changes, errors


def apply_changes(case, changes):
    for model_field, value in changes.items():
        setattr(case, model_field, value)

@cases_bp.get("/cases")
def get_cases():
    page = request.args.get(
        "page",
        default=1,
        type=int
    )

    per_page = request.args.get(
        "per_page",
        default=15,
        type=int
    )

    search = request.args.get(
        "search",
        default="",
        type=str
    ).strip()

    status = request.args.get(
        "status",
        default="",
        type=str
    ).strip()

    department = request.args.get(
        "department",
        default="",
        type=str
    ).strip()

    assignee = request.args.get(
        "assignee",
        default="",
        type=str
    ).strip()

    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")

    query = Case.query

    # Tìm kiếm
    if search:
        keyword = f"%{search}%"

        query = query.filter(
            or_(
                Case.external_case_code.ilike(keyword),
                Case.applicant_name.ilike(keyword),
                Case.procedure.has(
                    Procedure.name.ilike(keyword)
                ),
                Case.current_assignee.has(
                    User.full_name.ilike(keyword)
                ),
            )
        )

    # Trạng thái
    if status:
        query = query.filter(
            Case.status == status
        )

    # Phòng ban
    if department:
        query = query.filter(
            Case.department.has(
                Department.name.ilike(
                    f"%{department}%"
                )
            )
        )

    # Người xử lý
    if assignee:
        query = query.filter(
            Case.current_assignee.has(
                User.full_name.ilike(
                    f"%{assignee}%"
                )
            )
        )

    # Từ ngày tiếp nhận
    if from_date:
        try:
            start_date = datetime.strptime(
                from_date,
                "%Y-%m-%d"
            )

            query = query.filter(
                Case.received_at >= start_date
            )
        except ValueError:
            pass

    # Đến ngày tiếp nhận
    if to_date:
        try:
            end_date = datetime.strptime(
                to_date,
                "%Y-%m-%d"
            ).replace(
                hour=23,
                minute=59,
                second=59
            )

            query = query.filter(
                Case.received_at <= end_date
            )
        except ValueError:
            pass

    pagination = (
        query
        .order_by(Case.id.desc())
        .paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
    )

    data = []

    for case in pagination.items:
        data.append({
            "id": case.id,
            "caseCode": case.external_case_code,

            "procedureName": (
                case.procedure.name
                if case.procedure
                else None
            ),

            "departmentName": (
                case.department.name
                if case.department
                else None
            ),

            "assigneeName": (
                case.current_assignee.full_name
                if case.current_assignee
                else None
            ),

            "applicantName": case.applicant_name,
            "applicantPhone": case.applicant_phone,
            "agencyName": case.agency_name,

            "receivedAt": (
                case.received_at.isoformat()
                if case.received_at
                else None
            ),

            "appointmentDate": (
                case.appointment_date.isoformat()
                if case.appointment_date
                else None
            ),

            "dueAt": (
                case.due_at.isoformat()
                if case.due_at
                else None
            ),

            "completedAt": (
                case.completed_at.isoformat()
                if case.completed_at
                else None
            ),

            "status": case.status,
            "priority": case.priority,
            "currentStepName": case.current_step_name,
            "sourceType": case.source_type,
        })

    return jsonify({
        "success": True,
        "data": {
            "items": data,
            "pagination": {
                "page": pagination.page,
                "perPage": pagination.per_page,
                "total": pagination.total,
                "totalPages": pagination.pages,
                "hasNext": pagination.has_next,
                "hasPrev": pagination.has_prev,
            }
        },
        "message": "Lấy danh sách hồ sơ thành công",
        "errors": None,
    }), 200

@cases_bp.get("/cases/<int:case_id>")
def get_case_detail(case_id):
    case = Case.query.get(case_id)

    if not case:
        return jsonify({
            "success": False,
            "data": None,
            "message": "Không tìm thấy hồ sơ",
            "errors": {
                "caseId": case_id
            }
        }), 404

    data = {
        "id": case.id,
        "caseCode": case.external_case_code,

        "procedureId": case.procedure_id,
        "procedureName": (
            case.procedure.name
            if case.procedure
            else None
        ),

        "departmentId": case.department_id,
        "departmentName": (
            case.department.name
            if case.department
            else None
        ),

        "assigneeId": case.current_assignee_id,
        "assigneeName": (
            case.current_assignee.full_name
            if case.current_assignee
            else None
        ),

        "applicantName": case.applicant_name,
        "applicantPhone": case.applicant_phone,
        "agencyName": case.agency_name,

        "receivedAt": (
            case.received_at.isoformat()
            if case.received_at
            else None
        ),

        "appointmentDate": (
            case.appointment_date.isoformat()
            if case.appointment_date
            else None
        ),

        "dueAt": (
            case.due_at.isoformat()
            if case.due_at
            else None
        ),

        "completedAt": (
            case.completed_at.isoformat()
            if case.completed_at
            else None
        ),

        "status": case.status,
        "priority": case.priority,
        "currentStepName": case.current_step_name,
        "sourceType": case.source_type,

        "externalUpdatedAt": (
            case.external_updated_at.isoformat()
            if case.external_updated_at
            else None
        ),

        "createdAt": (
            case.created_at.isoformat()
            if case.created_at
            else None
        ),

        "updatedAt": (
            case.updated_at.isoformat()
            if case.updated_at
            else None
        ),
    }

    return jsonify({
        "success": True,
        "data": data,
        "message": "Lấy chi tiết hồ sơ thành công",
        "errors": None
    }), 200


@cases_bp.post("/cases")
def create_case():
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return error_response(
            "Dữ liệu JSON không hợp lệ",
            400,
            {"body": "Request body phải là một JSON object"}
        )

    case = Case()
    changes, validation_errors = validate_case_fields(
        case,
        payload,
        is_create=True
    )

    if validation_errors:
        return error_response(
            "Dữ liệu hồ sơ không hợp lệ",
            400,
            validation_errors
        )

    apply_changes(case, changes)

    now = datetime.now()
    case.created_at = now
    case.updated_at = now

    try:
        db.session.add(case)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Không thể tạo hồ sơ")
        return error_response(
            "Không thể tạo hồ sơ",
            500
        )

    return jsonify({
        "success": True,
        "data": {
            "id": case.id,
            "caseCode": case.external_case_code,
        },
        "message": "Tạo hồ sơ thành công",
        "errors": None,
    }), 201


@cases_bp.put("/cases/<int:case_id>")
def update_case(case_id):
    case = db.session.get(Case, case_id)

    if not case:
        return error_response(
            "Không tìm thấy hồ sơ",
            404,
            {"caseId": case_id}
        )

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return error_response(
            "Dữ liệu JSON không hợp lệ",
            400,
            {"body": "Request body phải là một JSON object"}
        )

    changes, validation_errors = validate_case_fields(case, payload)

    if validation_errors:
        return error_response(
            "Dữ liệu hồ sơ không hợp lệ",
            400,
            validation_errors
        )

    apply_changes(case, changes)
    case.updated_at = datetime.now()

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Không thể cập nhật hồ sơ id=%s",
            case_id
        )
        return error_response(
            "Không thể cập nhật hồ sơ",
            500
        )

    return jsonify({
        "success": True,
        "data": {
            "id": case.id,
            "caseCode": case.external_case_code,
        },
        "message": "Cập nhật hồ sơ thành công",
        "errors": None,
    }), 200


@cases_bp.delete("/cases/<int:case_id>")
def delete_case(case_id):
    case = db.session.get(Case, case_id)

    if not case:
        return error_response(
            "Không tìm thấy hồ sơ",
            404,
            {"caseId": case_id}
        )

    try:
        db.session.delete(case)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Không thể xóa hồ sơ id=%s",
            case_id
        )
        return error_response(
            "Không thể xóa hồ sơ",
            500
        )

    return jsonify({
        "success": True,
        "data": None,
        "message": "Xóa hồ sơ thành công",
        "errors": None,
    }), 200
