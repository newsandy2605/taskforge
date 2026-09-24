from app.main import health, root


def test_health():
    assert health() == {"status": "healthy"}


def test_root():
    result = root()
    assert result["name"] == "TaskForge API"
    assert result["status"] == "ok"
