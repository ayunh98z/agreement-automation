#!/usr/bin/env python3
"""Backfill `created_by_id` in `bl_agreement` from `auth_user` based on username.

Usage:
  python backfill_created_by_id.py         # dry-run, shows counts and sample mappings
  python backfill_created_by_id.py --apply --yes   # perform update (non-interactive)

This script is safe for local/dev use: it prints a preview and requires explicit
--apply (and --yes) to run updates. It uses Django DB connection from project.
"""
import os
import sys
import argparse
from pprint import pprint

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Backfill bl_agreement.created_by_id from auth_user')
    parser.add_argument('--apply', action='store_true', help='Perform UPDATE instead of dry-run')
    parser.add_argument('--yes', action='store_true', help='Skip confirmation prompt (use with --apply)')
    parser.add_argument('--limit', type=int, default=100, help='Limit sample rows to show')
    args = parser.parse_args()

    # Ensure we run from project root (where manage.py is)
    THIS_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_DIR = os.path.abspath(os.path.join(THIS_DIR, '..'))
    if PROJECT_DIR not in sys.path:
        sys.path.insert(0, PROJECT_DIR)

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
    try:
        import django
        django.setup()
    except Exception as e:
        print('Failed to setup Django environment:', e)
        sys.exit(2)

    from django.db import connection, transaction

    with connection.cursor() as cursor:
        # total rows that appear missing
        cursor.execute("SELECT COUNT(*) FROM bl_agreement WHERE created_by_id IS NULL OR created_by_id = 0")
        total_missing = cursor.fetchone()[0]

        # how many of them have a matching auth_user by username (case-insensitive)
        cursor.execute("""
            SELECT COUNT(*) FROM bl_agreement ba
            JOIN auth_user u ON LOWER(ba.created_by) = LOWER(u.username)
            WHERE ba.created_by_id IS NULL OR ba.created_by_id = 0
        """)
        matched = cursor.fetchone()[0]

        print('\nSummary:')
        print('  rows with missing created_by_id:', total_missing)
        print('  of those, matching auth_user found:', matched)

        print('\nSample mappings (up to limit):')
        cursor.execute("""
            SELECT ba.contract_number, ba.created_by, ba.created_by_id, u.id as user_id, u.username
            FROM bl_agreement ba
            LEFT JOIN auth_user u ON LOWER(ba.created_by) = LOWER(u.username)
            WHERE ba.created_by_id IS NULL OR ba.created_by_id = 0
            LIMIT %s
        """, [args.limit])
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]
        for r in rows:
            rec = dict(zip(cols, r))
            pprint(rec)

        if total_missing == 0:
            print('\nNothing to do.')
            sys.exit(0)

        if not args.apply:
            print('\nDry-run complete. To apply updates run with --apply --yes')
            sys.exit(0)

        if args.apply and not args.yes:
            confirm = input('\nApply update to set created_by_id for matching rows? Type YES to continue: ')
            if confirm.strip() != 'YES':
                print('Aborted by user.')
                sys.exit(0)

        # Perform update in a transaction and report counts
        try:
            with transaction.atomic():
                # Update matching rows where username resolves to a user id
                # This query is MySQL-compatible (JOIN update)
                update_sql = """
                    UPDATE bl_agreement ba
                    JOIN auth_user u ON LOWER(ba.created_by) = LOWER(u.username)
                    SET ba.created_by_id = u.id
                    WHERE ba.created_by_id IS NULL OR ba.created_by_id = 0
                """
                cursor.execute(update_sql)
                affected = cursor.rowcount
                print(f'Updated {affected} rows (created_by_id set from auth_user.id)')
        except Exception as e:
            print('Failed to apply updates:', e)
            sys.exit(1)

    print('Backfill completed.')
