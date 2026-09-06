from app.extensions import db


class Notification(db.Model):
    __tablename__ = "Notifications"

    CASE_REMINDER = "CASE_REMINDER"

    id = db.Column("Id", db.Integer, primary_key=True)
    receiver_user_id = db.Column(
        "ReceiverUserId",
        db.Integer,
        db.ForeignKey("Users.Id"),
        nullable=False,
    )
    sender_user_id = db.Column(
        "SenderUserId",
        db.Integer,
        db.ForeignKey("Users.Id"),
    )
    case_id = db.Column(
        "CaseId",
        db.Integer,
        db.ForeignKey("Cases.Id"),
        nullable=False,
    )
    type = db.Column("Type", db.String(50), nullable=False)
    title = db.Column("Title", db.Unicode(255), nullable=False)
    message = db.Column("Message", db.Unicode(2000), nullable=False)
    is_read = db.Column("IsRead", db.Boolean, nullable=False, default=False)
    created_at = db.Column("CreatedAt", db.DateTime, nullable=False)

    receiver = db.relationship("User", foreign_keys=[receiver_user_id])
    sender = db.relationship("User", foreign_keys=[sender_user_id])
    case = db.relationship("Case")
