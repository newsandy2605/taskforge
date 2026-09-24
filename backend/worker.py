import json
import time

from redis import Redis

from app.core.config import settings
from app.db import SessionLocal
from app.models import ActivityLog


def run():
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    print("TaskForge worker started")
    while True:
        item = redis.blpop("taskforge:jobs", timeout=5)
        if not item:
            continue

        _, raw = item
        job = json.loads(raw)
        print("processing job:", job)

        if job["job_type"] == "rebuild_project_cache":
            with SessionLocal() as db:
                db.add(ActivityLog(
                    project_id=job["project_id"],
                    user_id=job["requested_by"],
                    action="background_job",
                    message="Project cache rebuild job completed",
                ))
                db.commit()

        elif job["job_type"] == "send_digest":
            time.sleep(0.2)


if __name__ == "__main__":
    run()
