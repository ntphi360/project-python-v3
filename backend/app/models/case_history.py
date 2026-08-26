from app.extensions import db


class CaseHistory(db.Model):
    __tablename__ = "CaseHistory"

    CASE_CREATED = "CASE_CREATED"
    STATUS_CHANGED = "STATUS_CHANGED"
    ASSIGNEE_CHANGED = "ASSIGNEE_CHANGED"
    STEP_CHANGED = "STEP_CHANGED"

    id = db.Column("Id", db.Integer, primary_key=True)

    case_id = db.Column(
        "CaseId",
        db.Integer,
        db.ForeignKey("Cases.Id", ondelete="CASCADE"),
        nullable=False,
    )

    action = db.Column(
        "Action",
        db.String(50),
        nullable=False,
    )

    old_value = db.Column(
        "OldValue",
        db.Unicode(255),
    )

    new_value = db.Column(
        "NewValue",
        db.Unicode(255),
    )

    note = db.Column(
        "Note",
        db.Unicode(1000),
    )

    created_at = db.Column(
        "CreatedAt",
        db.DateTime,
        nullable=False,
    )

    case = db.relationship(
        "Case",
        back_populates="history",
    )
