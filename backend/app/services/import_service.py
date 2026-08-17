import pandas as pd

from app.extensions import db
from app.models.case import Case
from app.models.department import Department
from app.models.procedure import Procedure
from app.models.procedure_field import ProcedureField
from app.models.user import User


# format date
def parse_date(value):
    if pd.isna(value):
        return None

    value = pd.to_datetime(
        value,
        dayfirst=True,
        errors="coerce"
    )

    if pd.isna(value):
        return None

    return value.to_pydatetime()


# xử lý dữ liệu
def clean_text(value):
    if pd.isna(value):
        return None

    value = str(value).strip()

    if not value:
        return None

    return value


# đọc file
def import_case_file(file):
    filename = file.filename.lower()

    if filename.endswith(".csv"):
        df = pd.read_csv(
            file,
            encoding="utf-8-sig"
        )

    elif filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(file)

    else:
        raise ValueError(
            "Chỉ hỗ trợ file CSV, XLSX hoặc XLS"
        )

    # xóa dòng/cột hoàn toàn rỗng
    df = df.dropna(axis=1, how="all")
    df = df.dropna(how="all")

    # xử lý tên cột
    df.columns = df.columns.str.strip()

    required_columns = [
        "Số hồ sơ",
        "Tên thủ tục hành chính",
        "Tên lĩnh vực",
        "Phòng ban",
        "Ngày tiếp nhận",
        "Hạn xử lý",
        "Cán bộ xử lý hiện tại",
        "Trạng thái"
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            "Thiếu các cột bắt buộc: "
            + ", ".join(missing_columns)
        )

    imported = 0
    skipped = 0

    try:
        for _, row in df.iterrows():

            # mã hồ sơ
            case_code = clean_text(
                row.get("Số hồ sơ")
            )

            if not case_code:
                skipped += 1
                continue

            # hồ sơ đã tồn tại
            existing_case = Case.query.filter_by(
                external_case_code=case_code
            ).first()

            if existing_case:
                skipped += 1
                continue

            # lĩnh vực
            field_name = clean_text(
                row.get("Tên lĩnh vực")
            )

            procedure_field = None

            if field_name:
                procedure_field = ProcedureField.query.filter_by(
                    name=field_name
                ).first()

                if not procedure_field:
                    procedure_field = ProcedureField(
                        name=field_name,
                        is_active=True
                    )

                    db.session.add(procedure_field)
                    db.session.flush()

            # procedure
            procedure_name = clean_text(
                row.get("Tên thủ tục hành chính")
            )

            procedure = None

            if procedure_name:
                procedure = Procedure.query.filter_by(
                    name=procedure_name
                ).first()

                if not procedure:
                    procedure = Procedure(
                        name=procedure_name,
                        procedure_field_id=(
                            procedure_field.id
                            if procedure_field
                            else None
                        ),
                        default_processing_hours=0,
                        is_active=True
                    )

                    db.session.add(procedure)
                    db.session.flush()

            # department
            department_name = clean_text(
                row.get("Phòng ban")
            )

            department = None

            if department_name:
                department = Department.query.filter_by(
                    name=department_name
                ).first()

                if not department:
                    department = Department(
                        name=department_name,
                        is_active=True
                    )

                    db.session.add(department)
                    db.session.flush()

            # staff
            assignee_name = clean_text(
                row.get("Cán bộ xử lý hiện tại")
            )

            assignee = None

            if assignee_name:
                assignee = User.query.filter_by(
                    full_name=assignee_name
                ).first()

                if not assignee:
                    assignee = User(
                        full_name=assignee_name,
                        department_id=(
                            department.id
                            if department
                            else None
                        ),
                        is_active=True
                    )

                    db.session.add(assignee)
                    db.session.flush()

            # case
            case = Case(
                external_case_code=case_code,

                procedure_id=(
                    procedure.id
                    if procedure
                    else None
                ),

                department_id=(
                    department.id
                    if department
                    else None
                ),

                current_assignee_id=(
                    assignee.id
                    if assignee
                    else None
                ),

                applicant_name=clean_text(
                    row.get("Chủ hồ sơ")
                ),

                applicant_phone=clean_text(
                    row.get("Số điện thoại")
                ),

                agency_name=clean_text(
                    row.get("Cơ quan/đơn vị")
                ),

                received_at=parse_date(
                    row.get("Ngày tiếp nhận")
                ),

                appointment_date=parse_date(
                    row.get("Ngày hẹn trả")
                ),

                due_at=parse_date(
                    row.get("Hạn xử lý")
                ),

                completed_at=parse_date(
                    row.get("Ngày kết thúc xử lý")
                ),

                status=clean_text(
                    row.get("Trạng thái")
                ),

                source_type="IMPORT"
            )

            db.session.add(case)
            imported += 1

        # commit - xác nhận lưu vào db
        db.session.commit()

    except Exception:
        db.session.rollback()
        raise

    return {
        "imported": imported,
        "skipped": skipped
    }