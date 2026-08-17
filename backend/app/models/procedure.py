from app.extensions import db


class Procedure(db.Model):
    __tablename__ = "Procedures"

    id = db.Column("Id", db.Integer, primary_key=True)
    code = db.Column("Code", db.String(50))
    name = db.Column("Name", db.String(255), nullable=False)

    procedure_field_id = db.Column(
        "ProcedureFieldId",
        db.Integer,
        db.ForeignKey("ProcedureFields.Id")
    )

    default_processing_hours = db.Column(
        "DefaultProcessingHours",
        db.Integer
    )

    is_active = db.Column("IsActive", db.Boolean, default=True)
    created_at = db.Column("CreatedAt", db.DateTime)
    updated_at = db.Column("UpdatedAt", db.DateTime)

    procedure_field = db.relationship(
        "ProcedureField"
    )