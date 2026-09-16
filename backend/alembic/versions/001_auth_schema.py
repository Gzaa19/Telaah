"""001_auth_schema

Revision ID: 001_auth_schema
Revises: 
Create Date: 2026-09-16 15:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_auth_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector";')

    # 2. Table: researchers
    op.create_table(
        'researchers',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('email', name='uq_researchers_email')
    )
    op.create_index('idx_researchers_email', 'researchers', ['email'], unique=False)

    # 3. Table: user_sessions
    op.create_table(
        'user_sessions',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('researcher_id', sa.UUID(), sa.ForeignKey('researchers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_token', sa.String(length=512), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('session_token', name='uq_user_sessions_session_token')
    )
    op.create_index('idx_user_sessions_token', 'user_sessions', ['session_token'], unique=False)
    op.create_index('idx_user_sessions_researcher', 'user_sessions', ['researcher_id'], unique=False)

    # 4. Table: oauth_credentials
    op.create_table(
        'oauth_credentials',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('researcher_id', sa.UUID(), sa.ForeignKey('researchers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='google'),
        sa.Column('encrypted_access_token', sa.Text(), nullable=False),
        sa.Column('encrypted_refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_drive_granted', sa.Boolean(), nullable=False, server_default=sa.text('FALSE')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('researcher_id', name='uq_oauth_credentials_researcher_id')
    )
    op.create_index('idx_oauth_credentials_researcher', 'oauth_credentials', ['researcher_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_oauth_credentials_researcher', table_name='oauth_credentials')
    op.drop_table('oauth_credentials')

    op.drop_index('idx_user_sessions_researcher', table_name='user_sessions')
    op.drop_index('idx_user_sessions_token', table_name='user_sessions')
    op.drop_table('user_sessions')

    op.drop_index('idx_researchers_email', table_name='researchers')
    op.drop_table('researchers')
