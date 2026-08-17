from flask import Blueprint, jsonify, request

from app.models.case import Case


cases_bp = Blueprint("cases", __name__)


@cases_bp.get("/cases")
def get_cases():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    pagination = (
        Case.query
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
                "hasPrev": pagination.has_prev
            }
        },
        "message": "Lấy danh sách hồ sơ thành công",
        "errors": None
    }), 200