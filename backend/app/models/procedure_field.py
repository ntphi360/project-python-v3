from app.extensions import db


class ProcedureField(db.Model):
    __tablename__ = "ProcedureFields"

    id = db.Column(
        "Id",
        db.Integer,
        primary_key=True
    )

    code = db.Column(
        "Code",
        db.String(50)
    )

    name = db.Column(
        "Name",
        db.Unicode(255),
        nullable=False
    )

    is_active = db.Column(
        "IsActive",
        db.Boolean,
        default=True
    )

    created_at = db.Column(
        "CreatedAt",
        db.DateTime
    )