from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from datetime import datetime

from app.models.case import Case
from app.models.department import Department
from app.models.procedure import Procedure
from app.models.user import User


cases_bp = Blueprint("cases", __name__)

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