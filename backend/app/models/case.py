from app.extensions import db

class Case(db.Model):
    __tablename__ = "Cases"

    id = db.Column("Id", db.Integer, primary_key=True)

    external_case_code = db.Column(
        "ExternalCaseCode",
        db.String(100),
        unique=True,
        nullable=False
    )

    procedure_id = db.Column(
        "ProcedureId",
        db.Integer,
        db.ForeignKey("Procedures.Id")
    )

    department_id = db.Column(
        "DepartmentId",
        db.Integer,
        db.ForeignKey("Departments.Id")
    )

    # thông tin chủ hồ sơ
    applicant_name = db.Column(
        "ApplicantName",
        db.Unicode(255)
    )

    applicant_phone = db.Column(
        "ApplicantPhone",
        db.String(50)
    )

    agency_name = db.Column(
        "AgencyName",
        db.Unicode(255)
    )

    # thời gian xử lý
    received_at = db.Column(
        "ReceivedAt",
        db.DateTime
    )

    appointment_date = db.Column(
        "AppointmentDate",
        db.DateTime
    )

    due_at = db.Column(
        "DueAt",
        db.DateTime
    )

    completed_at = db.Column(
        "CompletedAt",
        db.DateTime
    )

    # trạng thái
    status = db.Column(
        "Status",
        db.Unicode(50)
    )

    priority = db.Column(
        "Priority",
        db.Unicode(50)
    )

    current_assignee_id = db.Column(
        "CurrentAssigneeId",
        db.Integer,
        db.ForeignKey("Users.Id")
    )

    current_step_name = db.Column(
        "CurrentStepName",
        db.Unicode(255)
    )

    source_type = db.Column(
        "SourceType",
        db.Unicode(50)
    )

    external_updated_at = db.Column(
        "ExternalUpdatedAt",
        db.DateTime
    )

    created_at = db.Column(
        "CreatedAt",
        db.DateTime
    )

    updated_at = db.Column(
        "UpdatedAt",
        db.DateTime
    )

    # relationships
    procedure = db.relationship("Procedure" )
    department = db.relationship("Department")
    current_assignee = db.relationship("User")