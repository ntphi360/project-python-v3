from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from app.extensions import db
from app.models.case import Case
from app.models.case_history import CaseHistory
from app.models.department import Department
from app.models.procedure import Procedure
from app.models.user import User
from app.services.case_code_service import (
    CaseCodeSequenceExhaustedError,
    generate_case_code,
)


cases_bp = Blueprint("cases", __name__)
AUTO_CODE_RETRY_LIMIT = 3
COMPLETED_STATUSES = {
    "Hoàn thành",
    "Đã hoàn thành",
    "Đã trả kết quả",
}

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

    if "caseCode" in payload:
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


def synchronize_completed_at(case, changes, payload, now, is_create=False):
    status = changes.get("status", case.status)
    completed_at_was_supplied = "completedAt" in payload

    if isinstance(status, str) and status in COMPLETED_STATUSES:
        if completed_at_was_supplied:
            if changes["completed_at"] is None:
                changes["completed_at"] = now
        elif case.completed_at is None:
            changes["completed_at"] = now
        return

    if (
        not is_create
        and "status" in payload
        and status != case.status
    ):
        changes["completed_at"] = None


def format_history_value(value):
    return "null" if value is None else f'"{value}"'


def create_change_history(case, action, old_value, new_value, label, now):
    return CaseHistory(
        case_id=case.id,
        action=action,
        old_value=None if old_value is None else str(old_value),
        new_value=None if new_value is None else str(new_value),
        note=(
            f"{label} thay đổi từ {format_history_value(old_value)} "
            f"sang {format_history_value(new_value)}"
        ),
        created_at=now,
    )


def build_update_histories(case, changes, now):
    histories = []

    if "status" in changes and case.status != changes["status"]:
        histories.append(create_change_history(
            case,
            CaseHistory.STATUS_CHANGED,
            case.status,
            changes["status"],
            "Trạng thái",
            now,
        ))

    if (
        "current_assignee_id" in changes
        and case.current_assignee_id != changes["current_assignee_id"]
    ):
        old_assignee_name = (
            case.current_assignee.full_name
            if case.current_assignee
            else None
        )
        new_assignee_id = changes["current_assignee_id"]
        new_assignee = (
            db.session.get(User, new_assignee_id)
            if new_assignee_id is not None
            else None
        )
        new_assignee_name = (
            new_assignee.full_name
            if new_assignee
            else None
        )
        histories.append(create_change_history(
            case,
            CaseHistory.ASSIGNEE_CHANGED,
            old_assignee_name,
            new_assignee_name,
            "Người xử lý",
            now,
        ))

    if (
        "current_step_name" in changes
        and case.current_step_name != changes["current_step_name"]
    ):
        histories.append(create_change_history(
            case,
            CaseHistory.STEP_CHANGED,
            case.current_step_name,
            changes["current_step_name"],
            "Bước xử lý",
            now,
        ))

    return histories


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


@cases_bp.get("/cases/<int:case_id>/history")
def get_case_history(case_id):
    if db.session.get(Case, case_id) is None:
        return error_response(
            "Không tìm thấy hồ sơ",
            404,
            {"caseId": case_id},
        )

    histories = (
        CaseHistory.query
        .filter(CaseHistory.case_id == case_id)
        .order_by(
            CaseHistory.created_at.desc(),
            CaseHistory.id.desc(),
        )
        .all()
    )

    data = [
        {
            "id": history.id,
            "caseId": history.case_id,
            "action": history.action,
            "oldValue": history.old_value,
            "newValue": history.new_value,
            "note": history.note,
            "createdAt": history.created_at.isoformat(),
        }
        for history in histories
    ]

    return jsonify({
        "success": True,
        "data": data,
        "message": "Lấy lịch sử hồ sơ thành công",
        "errors": None,
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

    changes, validation_errors = validate_case_fields(
        Case(),
        payload,
        is_create=True
    )

    if validation_errors:
        return error_response(
            "Dữ liệu hồ sơ không hợp lệ",
            400,
            validation_errors
        )

    now = datetime.now()
    synchronize_completed_at(
        Case(),
        changes,
        payload,
        now,
        is_create=True,
    )
    should_generate_case_code = "caseCode" not in payload
    case = None

    for attempt in range(AUTO_CODE_RETRY_LIMIT):
        case = Case()
        apply_changes(case, changes)
        case.created_at = now
        case.updated_at = now

        try:
            if should_generate_case_code:
                case.external_case_code = generate_case_code(now)

            history = CaseHistory(
                case=case,
                action=CaseHistory.CASE_CREATED,
                old_value=None,
                new_value=case.external_case_code or case.status,
                note="Tạo hồ sơ",
                created_at=now,
            )
            db.session.add_all([case, history])
            db.session.commit()
            break
        except CaseCodeSequenceExhaustedError:
            db.session.rollback()
            return error_response(
                "Đã hết mã hồ sơ có thể tạo trong ngày",
                409,
            )
        except IntegrityError:
            db.session.rollback()

            if should_generate_case_code and attempt < AUTO_CODE_RETRY_LIMIT - 1:
                continue

            return error_response(
                "Mã hồ sơ đã tồn tại, vui lòng thử lại",
                409,
                {"caseCode": "caseCode đã tồn tại"},
            )
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

    now = datetime.now()
    histories = build_update_histories(case, changes, now)
    synchronize_completed_at(case, changes, payload, now)
    db.session.add_all(histories)
    apply_changes(case, changes)
    case.updated_at = now

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
