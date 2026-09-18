"""prop eval settings and snapshots, signal_runs, timestamptz fix

Revision ID: b7f3c9a1d2e4
Revises: a1b2c3d4e5f6
Create Date: 2026-08-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b7f3c9a1d2e4'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Prop-firm evaluation rule books ─────────────────────────────
    op.create_table(
        'prop_eval_settings',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('provider', sa.String(20), nullable=True, server_default='ftmo'),
        sa.Column('phase', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('account_size', sa.Float(), nullable=True, server_default='100000'),
        sa.Column('profit_target_pct', sa.Float(), nullable=True, server_default='10'),
        sa.Column('max_daily_loss_pct', sa.Float(), nullable=True, server_default='2'),
        sa.Column('max_total_drawdown_pct', sa.Float(), nullable=True, server_default='5'),
        sa.Column('min_trading_days', sa.Integer(), nullable=True, server_default='5'),
        sa.Column('risk_per_trade_pct', sa.Float(), nullable=True, server_default='0.5'),
        sa.Column('max_open_trades', sa.Integer(), nullable=True, server_default='2'),
        sa.Column('max_consecutive_losses', sa.Integer(), nullable=True, server_default='3'),
        sa.Column('instruments', sa.JSON(), nullable=True),
        sa.Column('auto_execute', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('stop_on_daily_loss', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('news_guard_enabled', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('hold_over_weekend', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_prop_eval_settings_user_id', 'prop_eval_settings', ['user_id'])

    # ── Prop-eval progress snapshots (pushed by the local agent) ────
    op.create_table(
        'prop_eval_snapshots',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('balance', sa.Float(), nullable=True),
        sa.Column('equity', sa.Float(), nullable=True),
        sa.Column('peak_balance', sa.Float(), nullable=True),
        sa.Column('day_start_balance', sa.Float(), nullable=True),
        sa.Column('open_trades', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('daily_loss_pct', sa.Float(), nullable=True),
        sa.Column('drawdown_pct', sa.Float(), nullable=True),
        sa.Column('profit_pct', sa.Float(), nullable=True),
        sa.Column('trading_days_logged', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('phase', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('status', sa.String(20), nullable=True, server_default='running'),
        sa.Column('reason', sa.String(200), nullable=True),
        sa.Column('last_error', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_prop_eval_snapshots_user_id', 'prop_eval_snapshots', ['user_id'])
    op.create_index('ix_prop_eval_snapshots_user_time', 'prop_eval_snapshots', ['user_id', 'created_at'])

    # ── Promote signal_runs from runtime CREATE TABLE to schema ─────
    op.create_table(
        'signal_runs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('run_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_signal_runs_user_time', 'signal_runs', ['user_id', 'run_at'])

    # ── Fix: password_reset_tokens.expires_at must be tz-aware ──────
    op.alter_column('password_reset_tokens', 'expires_at',
                    existing_type=sa.DateTime(timezone=False),
                    type_=sa.DateTime(timezone=True),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('password_reset_tokens', 'expires_at',
                    existing_type=sa.DateTime(timezone=True),
                    type_=sa.DateTime(timezone=False),
                    existing_nullable=True)
    op.drop_index('ix_signal_runs_user_time', 'signal_runs')
    op.drop_table('signal_runs')
    op.drop_index('ix_prop_eval_snapshots_user_time', 'prop_eval_snapshots')
    op.drop_index('ix_prop_eval_snapshots_user_id', 'prop_eval_snapshots')
    op.drop_table('prop_eval_snapshots')
    op.drop_index('ix_prop_eval_settings_user_id', 'prop_eval_settings')
    op.drop_table('prop_eval_settings')
