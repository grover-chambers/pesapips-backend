"""demo contests and contest entries

Revision ID: c4d5e6f7a8b9
Revises: b7f3c9a1d2e4
Create Date: 2026-08-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c4d5e6f7a8b9'
down_revision = 'b7f3c9a1d2e4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'contests',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_balance', sa.Float(), nullable=False, server_default='10000'),
        sa.Column('start_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )
    op.create_index('ix_contests_id', 'contests', ['id'])

    op.create_table(
        'contest_entries',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('contest_id', sa.Integer(), sa.ForeignKey('contests.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('initial_balance', sa.Float(), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
        sa.UniqueConstraint('contest_id', 'user_id', name='uq_contest_user'),
    )
    op.create_index('ix_contest_entries_id', 'contest_entries', ['id'])


def downgrade() -> None:
    op.drop_table('contest_entries')
    op.drop_table('contests')
