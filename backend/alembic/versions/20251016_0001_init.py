"""init

Revision ID: 20251016_0001
Revises: 
Create Date: 2025-10-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251016_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ENUM type (if doesn't exist)
    try:
        op.execute("CREATE TYPE userrole AS ENUM ('patient', 'doctor', 'admin')")
    except Exception:
        pass  # Type already exists, skip

    op.create_table(
        'user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('patient', 'doctor', 'admin', name='userrole'), nullable=False),
        sa.Column('email_verified_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_user'))
    )
    op.create_index(op.f('ix_user_email'), 'user', ['email'], unique=True)
    op.create_index(op.f('ix_user_id'), 'user', ['id'], unique=False)

    op.create_table(
        'patient',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('preferred_language', sa.String(length=10), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], name=op.f('fk_patient_user_id_user')),
        sa.PrimaryKeyConstraint('user_id', name=op.f('pk_patient'))
    )

    op.create_table(
        'doctor',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('bio', sa.String(length=2000), nullable=True),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], name=op.f('fk_doctor_user_id_user')),
        sa.PrimaryKeyConstraint('user_id', name=op.f('pk_doctor'))
    )


def downgrade() -> None:
    op.drop_table('doctor')
    op.drop_table('patient')
    op.drop_index(op.f('ix_user_id'), table_name='user')
    op.drop_index(op.f('ix_user_email'), table_name='user')
    op.drop_table('user')
    try:
        op.execute("DROP TYPE userrole")
    except Exception:
        pass  # Type doesn't exist, skip
