from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from cleanup import cleanup_expired_files

scheduler = BlockingScheduler()

#Execute every week at midnight
@scheduler.scheduled_job(IntervalTrigger(weeks=1, hours=0, minutes=0))
def scheduled_cleanup():
    print("[CRONJOB] Executing scheduled cleanup...")
    cleanup_expired_files()

if __name__ == "__main__":
    print("[CRONJOB] Scheduler started.")
    scheduler.start()
