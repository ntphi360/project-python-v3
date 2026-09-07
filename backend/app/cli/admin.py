import click
from flask.cli import with_appcontext
from sqlalchemy import func, or_
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.user import User, UserRole


def prompt_required(label, maximum_length):
    while True:
        value = click.prompt(label, type=str).strip()
        if not value:
            click.echo(f"{label} không được để trống.", err=True)
            continue
        if len(value) > maximum_length:
            click.echo(
                f"{label} không được vượt quá {maximum_length} ký tự.",
                err=True,
            )
            continue
        return value


def prompt_password():
    while True:
        password = click.prompt(
            "Mật khẩu mới",
            type=str,
            hide_input=True,
            confirmation_prompt="Nhập lại mật khẩu",
        )
        if len(password) > 1024:
            click.echo(
                "Mật khẩu không được vượt quá 1024 ký tự.",
                err=True,
            )
            continue
        return password


def find_existing_user(identifier):
    normalized_identifier = identifier.strip().lower()
    return User.query.filter(or_(
        func.lower(User.username) == normalized_identifier,
        func.lower(User.email) == normalized_identifier,
    )).all()


def update_existing_admin():
    identifier = prompt_required("Username hoặc email", 255)
    users = find_existing_user(identifier)

    if not users:
        raise click.ClickException("Không tìm thấy user phù hợp.")
    if len(users) > 1:
        raise click.ClickException(
            "Có nhiều user trùng username/email; không thể chọn an toàn."
        )

    user = users[0]
    click.echo(
        f"Sẽ cập nhật user Id={user.id}, "
        f"username={user.username}, email={user.email}."
    )
    if not click.confirm("Tiếp tục đặt user này làm ADMIN?", default=False):
        raise click.Abort()

    user.set_password(prompt_password())
    user.role = UserRole.ADMIN
    user.is_active = True
    return user, False


def create_admin():
    username = prompt_required("Username", 100)
    email = prompt_required("Email", 255)
    full_name = prompt_required("Họ và tên", 255)

    duplicate = User.query.filter(or_(
        func.lower(User.username) == username.lower(),
        func.lower(User.email) == email.lower(),
    )).first()
    if duplicate:
        raise click.ClickException(
            "Username hoặc email đã thuộc một user hiện có."
        )

    if not click.confirm("Tạo user ADMIN mới với thông tin trên?", default=False):
        raise click.Abort()

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        role=UserRole.ADMIN,
        is_active=True,
    )
    user.set_password(prompt_password())
    db.session.add(user)
    return user, True


@click.command("bootstrap-admin")
@click.option(
    "--mode",
    type=click.Choice(["existing", "create"], case_sensitive=False),
    help="Chọn cập nhật user hiện có hoặc tạo user ADMIN mới.",
)
@with_appcontext
def bootstrap_admin(mode):
    """Cập nhật hoặc tạo một tài khoản quản trị viên."""
    selected_mode = mode or click.prompt(
        "Chọn thao tác",
        type=click.Choice(["existing", "create"], case_sensitive=False),
    )

    try:
        if selected_mode.lower() == "existing":
            user, was_created = update_existing_admin()
        else:
            user, was_created = create_admin()

        db.session.commit()
    except (click.Abort, click.ClickException):
        db.session.rollback()
        raise
    except (SQLAlchemyError, ValueError) as error:
        db.session.rollback()
        raise click.ClickException(
            "Không thể bootstrap tài khoản ADMIN."
        ) from error

    action = "Đã tạo" if was_created else "Đã cập nhật"
    click.echo(
        f"{action} user Id={user.id}, username={user.username} "
        "với Role=ADMIN và IsActive=true."
    )
