"""PostgreSQL lease heartbeat; all renewal transactions are short and fenced."""
from threading import Event, Thread


class LeaseHeartbeat:
    def __init__(self, dsn, event_id, token, lease_seconds, emit):
        self.dsn = dsn
        self.event_id = event_id
        self.token = token
        self.lease_seconds = lease_seconds
        self.emit = emit
        self.stop_event = Event()
        self.interval = max(0.2, min(20.0, lease_seconds / 3.0))
        self.thread = Thread(target=self._run, name="audio-lease-heartbeat", daemon=True)

    def start(self):
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        self.thread.join(timeout=10)
        if self.thread.is_alive():
            raise RuntimeError("Lease heartbeat did not stop")

    def renew_once(self):
        import psycopg
        with psycopg.connect(self.dsn, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute("""UPDATE outbox
                               SET lease_until=now()+(%s * interval '1 second')
                               WHERE id=%s AND lease_token=%s
                                 AND lease_until>now() AND processed_at IS NULL
                               RETURNING id""",
                            (self.lease_seconds, self.event_id, self.token))
                return cur.fetchone() is not None

    def _run(self):
        while not self.stop_event.wait(self.interval):
            try:
                if not self.renew_once():
                    self.emit("heartbeat_lost")
                    return
                self.emit("lease_renewed")
            except Exception:
                # Never log credentials or media. The final token check remains
                # authoritative even when heartbeat could not renew.
                self.emit("heartbeat_error")
                return
