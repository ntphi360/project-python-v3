from html import escape

from flask import current_app
from flask_mail import Message

from app.extensions import mail


class EmailConfigurationError(Exception):
    pass


class EmailDeliveryError(Exception):
    pass


def format_due_at(due_at):
    return due_at.strftime("%d/%m/%Y %H:%M") if due_at else "—"


def build_reminder_email_html(
    case_code,
    case_name,
    procedure_name,
    due_at,
    alert_label,
    message,
    sender_name,
):
    fields = [
        ("Mã hồ sơ", case_code),
        ("Tên hồ sơ", case_name),
        ("Thủ tục hành chính", procedure_name),
        ("Hạn xử lý", format_due_at(due_at)),
        ("Mức cảnh báo", alert_label),
        ("Người gửi", sender_name),
    ]
    details = "".join(
        (
            "<tr>"
            f'<td style="padding:6px 12px 6px 0;color:#64748b">{escape(label)}</td>'
            f'<td style="padding:6px 0;color:#172554">{escape(str(value or "—"))}</td>'
            "</tr>"
        )
        for label, value in fields
    )
    safe_message = escape(message).replace("\n", "<br>")

    return (
        '<div style="font-family:Arial,sans-serif;color:#172554;line-height:1.5">'
        '<h2 style="margin:0 0 16px">Nhắc nhở xử lý hồ sơ</h2>'
        f'<table style="border-collapse:collapse">{details}</table>'
        '<div style="margin-top:18px;padding:14px;background:#f8fafc;'
        'border-left:4px solid #2563eb">'
        f'<strong>Nội dung nhắc nhở</strong><div style="margin-top:6px">{safe_message}</div>'
        "</div></div>"
    )


def validate_mail_config():
    required_config = (
        "MAIL_SERVER",
        "MAIL_PORT",
        "MAIL_USERNAME",
        "MAIL_PASSWORD",
        "MAIL_DEFAULT_SENDER",
    )
    for config_name in required_config:
        if not current_app.config.get(config_name):
            raise EmailConfigurationError(
                f"{config_name} chưa được cấu hình"
            )

    if (
        current_app.config.get("MAIL_USE_TLS")
        and current_app.config.get("MAIL_USE_SSL")
    ):
        raise EmailConfigurationError(
            "MAIL_USE_TLS và MAIL_USE_SSL không thể cùng bật"
        )


def send_case_reminder_email(
    recipient_email,
    case_code,
    case_name,
    procedure_name,
    due_at,
    alert_label,
    message,
    sender_name=None,
):
    if not isinstance(recipient_email, str) or not recipient_email.strip():
        raise EmailDeliveryError("Người nhận chưa có email")

    validate_mail_config()
    normalized_recipient = recipient_email.strip()
    email_message = Message(
        subject=f"Nhắc nhở xử lý hồ sơ {case_code}",
        recipients=[normalized_recipient],
        html=build_reminder_email_html(
            case_code=case_code,
            case_name=case_name,
            procedure_name=procedure_name,
            due_at=due_at,
            alert_label=alert_label,
            message=message,
            sender_name=sender_name,
        ),
    )

    try:
        mail.send(email_message)
    except Exception as error:
        current_app.logger.error(
            "Flask-Mail gửi email thất bại. "
            "case=%s recipient=%s error_type=%s error=%s",
            case_code,
            normalized_recipient,
            type(error).__name__,
            str(error),
        )
        raise EmailDeliveryError("Không thể gửi email nhắc nhở") from error
