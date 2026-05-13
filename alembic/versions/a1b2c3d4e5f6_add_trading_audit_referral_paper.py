"""add trading audit referral and paper trade models

Revision ID: a1b2c3d4e5f6
Revises: 07803e85e442
Create Date: 2026-05-13 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '07803e85e442'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'signal_audit',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('symbol', sa.String(20), nullable=False),
        sa.Column('timeframe', sa.String(10), nullable=False),
        sa.Column('signal', sa.String(10), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('price_at_signal', sa.Float(), nullable=True),
        sa.Column('sl_price', sa.Float(), nullable=True),
        sa.Column('tp_price', sa.Float(), nullable=True),
        sa.Column('regime', sa.String(30), nullable=True),
        sa.Column('regime_confidence', sa.Integer(), nullable=True),
        sa.Column('strategy_id', sa.Integer(), nullable=True),
        sa.Column('strategy_name', sa.String(100), nullable=True),
        sa.Column('strategy_fit', sa.String(20), nullable=True),
        sa.Column('lot_size', sa.Float(), nullable=True),
        sa.Column('data_source', sa.String(20), nullable=True, server_default='live'),
        sa.Column('is_auto', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('mt5_ticket', sa.Integer(), nullable=True),
        sa.Column('exit_price', sa.Float(), nullable=True),
        sa.Column('exit_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('pnl', sa.Float(), nullable=True),
        sa.Column('result', sa.String(10), nullable=True),
        sa.Column('pnl_points', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_signal_audit_user_time', 'signal_audit', ['user_id', 'created_at'])
    op.create_index('ix_signal_audit_symbol', 'signal_audit', ['symbol', 'created_at'])

    op.create_table(
        'referral_codes',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('code', sa.String(20), nullable=False, unique=True),
        sa.Column('uses', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_referral_codes_code'), 'referral_codes', ['code'], unique=True)

    op.create_table(
        'referral_uses',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('referrer_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('referred_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('reward_months', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        'paper_trades',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('symbol', sa.String(20), nullable=False),
        sa.Column('trade_type', sa.String(10), nullable=False),
        sa.Column('lot', sa.Float(), nullable=True, server_default='0.01'),
        sa.Column('entry_price', sa.Float(), nullable=False),
        sa.Column('sl', sa.Float(), nullable=True),
        sa.Column('tp', sa.Float(), nullable=True),
        sa.Column('current_price', sa.Float(), nullable=True),
        sa.Column('profit', sa.Float(), nullable=True, server_default='0'),
        sa.Column('status', sa.String(), nullable=True, server_default='open'),
        sa.Column('strategy_name', sa.String(100), nullable=True),
        sa.Column('signal_audit_id', sa.Integer(), sa.ForeignKey('signal_audit.id'), nullable=True),
        sa.Column('opened_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column('users', sa.Column('referral_code', sa.String(20), nullable=True, unique=True))
    op.add_column('users', sa.Column('paper_trading_enabled', sa.Boolean(), nullable=True, server_default='true'))


def downgrade() -> None:
    op.drop_column('users', 'paper_trading_enabled')
    op.drop_column('users', 'referral_code')
    op.drop_table('paper_trades')
    op.drop_table('referral_uses')
    op.drop_table('referral_codes')
    op.drop_index('ix_signal_audit_symbol', 'signal_audit')
    op.drop_index('ix_signal_audit_user_time', 'signal_audit')
    op.drop_table('signal_audit')
