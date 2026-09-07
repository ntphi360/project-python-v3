from app.cli.admin import bootstrap_admin


def register_cli_commands(app):
    app.cli.add_command(bootstrap_admin)
