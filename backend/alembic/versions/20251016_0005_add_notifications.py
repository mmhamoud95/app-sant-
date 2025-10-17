"""add notifications table

Revision ID: 20251016_0005
Revises: 20251016_0004
Create Date: 2025-10-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251016_0005"
down_revision = "20251016_0004"
branch_labels = None
depends_on = None


notification_status = sa.Enum(
    "pending",
    "sent",
    "failed",
    name="notificationstatus",
)


def upgrade() -> None:
    bind = op.get_bind()
    notification_status.create(bind, checkfirst=True)

    op.create_table(
        "notification",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=True),
        sa.Column("type", sa.String(length=120), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("status", notification_status, nullable=False, server_default=sa.text("'pending'::notificationstatus")),
        sa.Column("scheduled_for", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], name=op.f("fk_notification_user_id_user")),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointment.id"], name=op.f("fk_notification_appointment_id_appointment"), ondelete="SET NULL"),
    )
    op.create_index(op.f("ix_notification_id"), "notification", ["id"], unique=False)
    op.create_index(op.f("ix_notification_user_id"), "notification", ["user_id"], unique=False)
    op.create_index(op.f("ix_notification_appointment_id"), "notification", ["appointment_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notification_appointment_id"), table_name="notification")
    op.drop_index(op.f("ix_notification_user_id"), table_name="notification")
    op.drop_index(op.f("ix_notification_id"), table_name="notification")
    op.drop_table("notification")

    bind = op.get_bind()
    notification_status.drop(bind, checkfirst=True)
