"""add appointments table

Revision ID: 20251016_0004
Revises: 20251016_0003
Create Date: 2025-10-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251016_0004"
down_revision = "20251016_0003"
branch_labels = None
depends_on = None


appointment_status = sa.Enum(
    "booked",
    "confirmed",
    "cancelled",
    "completed",
    name="appointmentstatus",
)


def upgrade() -> None:
    bind = op.get_bind()
    appointment_status.create(bind, checkfirst=True)

    op.create_table(
        "appointment",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("slot_id", sa.Integer(), nullable=False),
    sa.Column("status", appointment_status, nullable=False, server_default=sa.text("'booked'::appointmentstatus")),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["patient_id"], ["patient.user_id"], name=op.f("fk_appointment_patient_id_patient")),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctor.user_id"], name=op.f("fk_appointment_doctor_id_doctor")),
        sa.ForeignKeyConstraint(["slot_id"], ["slot.id"], name=op.f("fk_appointment_slot_id_slot"), ondelete="CASCADE"),
        sa.UniqueConstraint("slot_id", name=op.f("uq_appointment_slot_id")),
    )
    op.create_index(op.f("ix_appointment_id"), "appointment", ["id"], unique=False)
    op.create_index(op.f("ix_appointment_patient_id"), "appointment", ["patient_id"], unique=False)
    op.create_index(op.f("ix_appointment_doctor_id"), "appointment", ["doctor_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_appointment_doctor_id"), table_name="appointment")
    op.drop_index(op.f("ix_appointment_patient_id"), table_name="appointment")
    op.drop_index(op.f("ix_appointment_id"), table_name="appointment")
    op.drop_table("appointment")

    bind = op.get_bind()
    appointment_status.drop(bind, checkfirst=True)
