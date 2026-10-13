#!/bin/sh
set -eu

DB_ROOT="${WORKSHOP_DB_ROOT:-/workspace/db}"
MIGRATION_FILE="$DB_ROOT/migrations/001_init_procurement_mvp.sql"
BOOKMARK_MIGRATION_FILE="$DB_ROOT/migrations/002_purchase_order_bookmarks.sql"
SEED_FILE="$DB_ROOT/seeds/002_seed_procurement_mvp.sql"

if [ ! -r "$MIGRATION_FILE" ]; then
	echo "[initdb] ERROR: migration file not found: $MIGRATION_FILE" >&2
	exit 1
fi

if [ ! -r "$BOOKMARK_MIGRATION_FILE" ]; then
	echo "[initdb] ERROR: migration file not found: $BOOKMARK_MIGRATION_FILE" >&2
	exit 1
fi

if [ ! -r "$SEED_FILE" ]; then
	echo "[initdb] ERROR: seed file not found: $SEED_FILE" >&2
	exit 1
fi

echo "[initdb] Running baseline migration..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$MIGRATION_FILE"

echo "[initdb] Running PO bookmark migration..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$BOOKMARK_MIGRATION_FILE"

echo "[initdb] Seeding sample data..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SEED_FILE"

echo "[initdb] Database initialization complete."
