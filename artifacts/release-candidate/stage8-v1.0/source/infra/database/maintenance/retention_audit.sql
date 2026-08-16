SELECT 'expired_idempotency_records' AS metric, count(*)::bigint AS due_count
FROM mathchakchak.idempotency_record
WHERE expires_at <= now()
UNION ALL
SELECT 'audit_events_older_than_12_months', count(*)::bigint
FROM mathchakchak.audit_event
WHERE created_at < now() - interval '12 months'
UNION ALL
SELECT 'diagnostic_records_older_than_24_months', count(*)::bigint
FROM mathchakchak.diagnostic_session
WHERE created_at < now() - interval '24 months'
UNION ALL
SELECT 'learning_records_older_than_24_months', count(*)::bigint
FROM mathchakchak.learning_session
WHERE created_at < now() - interval '24 months';
