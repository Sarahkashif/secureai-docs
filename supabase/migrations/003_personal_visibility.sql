-- Run this file ON ITS OWN, before 004. Postgres cannot use a new enum value in the same transaction that adds it.
--
-- 'personal' = visible only to the uploader plus HR managers and admins.
-- Employees always upload as 'personal', so one employee's files are never exposed to other employees.
alter type doc_sensitivity add value if not exists 'personal';
