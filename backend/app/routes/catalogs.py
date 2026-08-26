from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.case import Case
from app.models.department import Department
from app.models.procedure import Procedure
from app.models.procedure_field import ProcedureField
from app.models.user import User


catalogs_bp = Blueprint("catalogs", __name__)


def success_response(data, message):
    return jsonify({
        "success": True,
        "data": data,
        "message": message,
        "errors": None,
    }), 200


def error_response(message, status_code, errors=None):
    return jsonify({
        "success": False,
        "data": None,
        "message": message,
        "errors": errors,
    }), status_code


def database_error_response(resource_name):
    current_app.logger.exception(
        "Không thể lấy danh sách %s",
        resource_name,
    )
    return error_response(
        f"Không thể lấy danh sách {resource_name}",
        500,
    )


@catalogs_bp.get("/procedures")
def get_procedures():
    try:
        rows = (
            db.session.query(
                Procedure.id,
                Procedure.name,
                ProcedureField.id.label("field_id"),
                ProcedureField.name.label("field_name"),
            )
            .outerjoin(
                ProcedureField,
                Procedure.procedure_field_id == ProcedureField.id,
            )
            .order_by(Procedure.name.asc())
            .all()
        )
    except SQLAlchemyError:
        return database_error_response("thủ tục")

    data = [
        {
            "id": row.id,
            "name": row.name,
            "fieldId": row.field_id,
            "fieldName": row.field_name,
        }
        for row in rows
    ]

    return success_response(
        data,
        "Lấy danh sách thủ tục thành công",
    )


@catalogs_bp.get("/procedure-fields")
def get_procedure_fields():
    try:
        rows = (
            db.session.query(
                ProcedureField.id,
                ProcedureField.name,
            )
            .order_by(ProcedureField.name.asc())
            .all()
        )
    except SQLAlchemyError:
        return database_error_response("lĩnh vực")

    data = [
        {
            "id": row.id,
            "name": row.name,
        }
        for row in rows
    ]

    return success_response(
        data,
        "Lấy danh sách lĩnh vực thành công",
    )


@catalogs_bp.get("/departments")
def get_departments():
    try:
        rows = (
            db.session.query(
                Department.id,
                Department.name,
            )
            .order_by(Department.name.asc())
            .all()
        )
    except SQLAlchemyError:
        return database_error_response("phòng ban")

    data = [
        {
            "id": row.id,
            "name": row.name,
        }
        for row in rows
    ]

    return success_response(
        data,
        "Lấy danh sách phòng ban thành công",
    )


@catalogs_bp.get("/agencies")
def get_agencies():
    try:
        rows = (
            db.session.query(Case.agency_name)
            .filter(Case.agency_name.isnot(None))
            .distinct()
            .all()
        )
    except SQLAlchemyError:
        return database_error_response("đơn vị")

    names = sorted(
        row.agency_name
        for row in rows
        if row.agency_name.strip()
    )
    data = [{"name": name} for name in names]

    return success_response(
        data,
        "Lấy danh sách đơn vị thành công",
    )


def parse_department_id():
    raw_department_id = request.args.get("department_id")

    if raw_department_id is None:
        return None, None

    try:
        department_id = int(raw_department_id)
    except (TypeError, ValueError):
        return None, "department_id phải là số nguyên dương"

    if department_id <= 0:
        return None, "department_id phải là số nguyên dương"

    return department_id, None


@catalogs_bp.get("/users")
def get_users():
    department_id, validation_error = parse_department_id()

    if validation_error:
        return error_response(
            "Tham số truy vấn không hợp lệ",
            400,
            {"department_id": validation_error},
        )

    try:
        if (
            department_id is not None
            and db.session.get(Department, department_id) is None
        ):
            return error_response(
                "Không tìm thấy phòng ban",
                404,
                {"department_id": department_id},
            )

        query = (
            db.session.query(
                User.id,
                User.full_name,
                User.department_id,
                Department.name.label("department_name"),
            )
            .outerjoin(
                Department,
                User.department_id == Department.id,
            )
        )

        if department_id is not None:
            query = query.filter(User.department_id == department_id)

        rows = query.order_by(User.full_name.asc()).all()
    except SQLAlchemyError:
        return database_error_response("cán bộ")

    data = [
        {
            "id": row.id,
            "fullName": row.full_name,
            "departmentId": row.department_id,
            "departmentName": row.department_name,
        }
        for row in rows
    ]

    return success_response(
        data,
        "Lấy danh sách cán bộ thành công",
    )
