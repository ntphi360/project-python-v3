import logging
from logging.config import fileConfig

from flask import current_app

from alembic import context


# Alembic Config
config = context.config

# Logging
fileConfig(config.config_file_name)
logger = logging.getLogger("alembic.env")


def get_engine():
    try:
        # Flask-SQLAlchemy < 3
        return current_app.extensions["migrate"].db.get_engine()
    except (TypeError, AttributeError):
        # Flask-SQLAlchemy >= 3
        return current_app.extensions["migrate"].db.engine


def get_engine_url():
    try:
        return (
            get_engine()
            .url.render_as_string(hide_password=False)
            .replace("%", "%%")
        )
    except AttributeError:
        return str(get_engine().url).replace("%", "%%")


# Database metadata
config.set_main_option("sqlalchemy.url", get_engine_url())
target_db = current_app.extensions["migrate"].db


def get_metadata():
    if hasattr(target_db, "metadatas"):
        return target_db.metadatas[None]

    return target_db.metadata


# =========================================================
# Custom type comparison
# Giúp Alembic nhận VARCHAR <-> Unicode/NVARCHAR trên MSSQL
# =========================================================
def compare_type(
    context,
    inspected_column,
    metadata_column,
    inspected_type,
    metadata_type,
):
    inspected_name = inspected_type.__class__.__name__.upper()
    metadata_name = metadata_type.__class__.__name__.upper()

    # Database đang VARCHAR
    # Model đã đổi sang db.Unicode(...)
    if (
        inspected_name == "VARCHAR"
        and metadata_name in ("UNICODE", "NVARCHAR")
    ):
        return True

    # Trường hợp downgrade/ngược lại
    if (
        inspected_name == "NVARCHAR"
        and metadata_name in ("VARCHAR", "STRING")
    ):
        return True

    # None = để Alembic xử lý bình thường
    return None


def run_migrations_offline():
    """Run migrations in offline mode."""

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=get_metadata(),
        literal_binds=True,
        compare_type=compare_type,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in online mode."""

    # Không tạo migration nếu không có thay đổi schema
    def process_revision_directives(context, revision, directives):
        if getattr(config.cmd_opts, "autogenerate", False):
            script = directives[0]

            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info("No changes in schema detected.")

    conf_args = current_app.extensions["migrate"].configure_args

    # Custom compare type
    conf_args["compare_type"] = compare_type

    if conf_args.get("process_revision_directives") is None:
        conf_args["process_revision_directives"] = (
            process_revision_directives
        )

    connectable = get_engine()

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=get_metadata(),
            **conf_args,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()