import os
import pytest

RUN_INTEGRATION = os.environ.get('RUN_INTEGRATION') == '1'


def pytest_configure(config):
    # If integration tests are disabled, block the pytest_django plugin early
    # to avoid any database setup or migration attempts during collection.
    if not RUN_INTEGRATION:
        try:
            config.pluginmanager.set_blocked('pytest_django')
        except Exception:
            try:
                config.pluginmanager.disable('pytest_django')
            except Exception:
                pass


def pytest_collection_modifyitems(config, items):
    """Skip integration / DB-dependent tests by default to make local runs fast.

    Criteria to treat a test as integration:
    - marked with @pytest.mark.integration
    - marked/requesting `django_db` via marker
    - uses fixtures: `db`, `transactional_db`, or `live_server`

    To run integration tests set environment variable `RUN_INTEGRATION=1`.
    """
    if RUN_INTEGRATION:
        return

    skip_marker = pytest.mark.skip(reason="Integration tests skipped by default. Set RUN_INTEGRATION=1 to enable.")
    for item in items:
        try:
            is_integration = False
            if item.get_closest_marker('integration'):
                is_integration = True
            if item.get_closest_marker('django_db'):
                is_integration = True
            fnames = set(getattr(item, 'fixturenames', []))
            if fnames & {'db', 'transactional_db', 'live_server'}:
                is_integration = True
            if is_integration:
                item.add_marker(skip_marker)
        except Exception:
            # Be conservative: if detection fails, don't skip automatically
            continue
