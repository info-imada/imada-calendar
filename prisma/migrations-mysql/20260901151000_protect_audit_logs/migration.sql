CREATE TRIGGER `calendar_audit_logs_no_update`
BEFORE UPDATE ON `calendar_audit_logs`
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs are immutable';

CREATE TRIGGER `calendar_audit_logs_no_delete`
BEFORE DELETE ON `calendar_audit_logs`
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs are immutable';
