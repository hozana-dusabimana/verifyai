-- VerifyAI Database Schema for MariaDB 10.4 (XAMPP)
-- Run: mysql -u root verifyai < schema.sql

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ═══════════════════════════════════════════════════════════════════
-- Django Core Tables
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `django_content_type` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `app_label` VARCHAR(100) NOT NULL,
    `model` VARCHAR(100) NOT NULL,
    UNIQUE KEY `django_content_type_app_label_model` (`app_label`, `model`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `auth_permission` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `content_type_id` INT NOT NULL,
    `codename` VARCHAR(100) NOT NULL,
    UNIQUE KEY `auth_permission_content_type_id_codename` (`content_type_id`, `codename`),
    CONSTRAINT `auth_permission_content_type_fk` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `auth_group` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `auth_group_permissions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `group_id` INT NOT NULL,
    `permission_id` INT NOT NULL,
    UNIQUE KEY `auth_group_permissions_group_id_permission_id` (`group_id`, `permission_id`),
    CONSTRAINT `auth_group_permissions_group_fk` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
    CONSTRAINT `auth_group_permissions_perm_fk` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `django_session` (
    `session_key` VARCHAR(40) PRIMARY KEY,
    `session_data` LONGTEXT NOT NULL,
    `expire_date` DATETIME(6) NOT NULL,
    KEY `django_session_expire_date` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `django_admin_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `action_time` DATETIME(6) NOT NULL,
    `object_id` LONGTEXT,
    `object_repr` VARCHAR(200) NOT NULL,
    `action_flag` SMALLINT UNSIGNED NOT NULL,
    `change_message` LONGTEXT NOT NULL,
    `content_type_id` INT DEFAULT NULL,
    `user_id` CHAR(32) NOT NULL,
    CONSTRAINT `django_admin_log_content_type_fk` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `django_migrations` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `app` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `applied` DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════
-- Users (Custom Auth Model)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `users` (
    `id` CHAR(32) NOT NULL PRIMARY KEY,
    `password` VARCHAR(128) NOT NULL,
    `last_login` DATETIME(6) DEFAULT NULL,
    `is_superuser` TINYINT(1) NOT NULL DEFAULT 0,
    `username` VARCHAR(150) NOT NULL UNIQUE,
    `first_name` VARCHAR(150) NOT NULL DEFAULT '',
    `last_name` VARCHAR(150) NOT NULL DEFAULT '',
    `is_staff` TINYINT(1) NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `date_joined` DATETIME(6) NOT NULL,
    `email` VARCHAR(254) NOT NULL UNIQUE,
    `organization` VARCHAR(255) NOT NULL DEFAULT '',
    `role` VARCHAR(20) NOT NULL DEFAULT 'citizen',
    `is_email_verified` TINYINT(1) NOT NULL DEFAULT 0,
    `email_verification_token` VARCHAR(128) NOT NULL DEFAULT '',
    `password_reset_token` VARCHAR(128) NOT NULL DEFAULT '',
    `password_reset_token_created` DATETIME(6) DEFAULT NULL,
    `oauth_provider` VARCHAR(50) DEFAULT NULL,
    `oauth_uid` VARCHAR(255) DEFAULT NULL,
    `profile_photo` VARCHAR(100) DEFAULT NULL,
    `is_2fa_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `totp_secret` VARCHAR(64) NOT NULL DEFAULT '',
    `failed_login_attempts` INT NOT NULL DEFAULT 0,
    `lockout_until` DATETIME(6) DEFAULT NULL,
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_groups` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` CHAR(32) NOT NULL,
    `group_id` INT NOT NULL,
    UNIQUE KEY `users_groups_user_id_group_id` (`user_id`, `group_id`),
    CONSTRAINT `users_groups_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `users_groups_group_fk` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_user_permissions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` CHAR(32) NOT NULL,
    `permission_id` INT NOT NULL,
    UNIQUE KEY `users_user_permissions_user_id_perm_id` (`user_id`, `permission_id`),
    CONSTRAINT `users_user_permissions_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `users_user_permissions_perm_fk` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add FK for admin log after users table exists
ALTER TABLE `django_admin_log` ADD CONSTRAINT `django_admin_log_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

-- ═══════════════════════════════════════════════════════════════════
-- API Keys
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `api_keys` (
    `id` CHAR(32) NOT NULL PRIMARY KEY,
    `user_id` CHAR(32) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `key_hash` VARCHAR(128) NOT NULL UNIQUE,
    `prefix` VARCHAR(8) NOT NULL,
    `last_used_at` DATETIME(6) DEFAULT NULL,
    `created_at` DATETIME(6) NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT `api_keys_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════
-- Articles & Analysis Results
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `articles` (
    `id` CHAR(32) NOT NULL PRIMARY KEY,
    `user_id` CHAR(32) NOT NULL,
    `input_type` VARCHAR(10) NOT NULL,
    `original_url` VARCHAR(2048) NOT NULL DEFAULT '',
    `title` VARCHAR(500) NOT NULL DEFAULT '',
    `author` VARCHAR(255) NOT NULL DEFAULT '',
    `source_name` VARCHAR(255) NOT NULL DEFAULT '',
    `publication_date` DATE DEFAULT NULL,
    `content` LONGTEXT NOT NULL,
    `uploaded_file` VARCHAR(100) DEFAULT NULL,
    `created_at` DATETIME(6) NOT NULL,
    CONSTRAINT `articles_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `analysis_results` (
    `id` CHAR(32) NOT NULL PRIMARY KEY,
    `article_id` CHAR(32) NOT NULL UNIQUE,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `current_stage` INT NOT NULL DEFAULT 0,
    `current_stage_name` VARCHAR(50) NOT NULL DEFAULT '',
    `naive_bayes_score` DOUBLE DEFAULT NULL,
    `lstm_score` DOUBLE DEFAULT NULL,
    `distilbert_score` DOUBLE DEFAULT NULL,
    `ensemble_score` DOUBLE DEFAULT NULL,
    `credibility_score` DOUBLE DEFAULT NULL,
    `classification` VARCHAR(20) NOT NULL DEFAULT '',
    `confidence` DOUBLE DEFAULT NULL,
    `sentiment_score` DOUBLE DEFAULT NULL,
    `emotional_tone` VARCHAR(50) NOT NULL DEFAULT '',
    `sensationalism_score` DOUBLE DEFAULT NULL,
    `headline_body_consistency` DOUBLE DEFAULT NULL,
    `top_keywords` JSON DEFAULT NULL,
    `flagging_reasons` JSON DEFAULT NULL,
    `feature_vector` JSON DEFAULT NULL,
    `is_flagged_for_review` TINYINT(1) NOT NULL DEFAULT 0,
    `flagged_by_id` CHAR(32) DEFAULT NULL,
    `celery_task_id` VARCHAR(255) NOT NULL DEFAULT '',
    `error_message` LONGTEXT NOT NULL DEFAULT '',
    `created_at` DATETIME(6) NOT NULL,
    `completed_at` DATETIME(6) DEFAULT NULL,
    CONSTRAINT `analysis_results_article_fk` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `analysis_results_flagged_by_fk` FOREIGN KEY (`flagged_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════
-- Alerts & Notification Preferences
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `alerts` (
    `id` CHAR(32) NOT NULL PRIMARY KEY,
    `analysis_result_id` CHAR(32) NOT NULL,
    `user_id` CHAR(32) NOT NULL,
    `assigned_to_id` CHAR(32) DEFAULT NULL,
    `severity` VARCHAR(10) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `message` LONGTEXT NOT NULL,
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NOT NULL,
    `resolved_at` DATETIME(6) DEFAULT NULL,
    CONSTRAINT `alerts_analysis_result_fk` FOREIGN KEY (`analysis_result_id`) REFERENCES `analysis_results` (`id`) ON DELETE CASCADE,
    CONSTRAINT `alerts_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `alerts_assigned_to_fk` FOREIGN KEY (`assigned_to_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notification_preferences` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` CHAR(32) NOT NULL UNIQUE,
    `email_on_high_risk` TINYINT(1) NOT NULL DEFAULT 1,
    `email_on_analysis_complete` TINYINT(1) NOT NULL DEFAULT 0,
    `alert_threshold` INT NOT NULL DEFAULT 30,
    `email_frequency` VARCHAR(20) NOT NULL DEFAULT 'immediate',
    CONSTRAINT `notification_prefs_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════
-- Reports
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `reports` (
    `id` CHAR(32) NOT NULL PRIMARY KEY,
    `user_id` CHAR(32) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `report_format` VARCHAR(10) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `file` VARCHAR(100) DEFAULT NULL,
    `date_from` DATE DEFAULT NULL,
    `date_to` DATE DEFAULT NULL,
    `created_at` DATETIME(6) NOT NULL,
    CONSTRAINT `reports_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════
-- Administration
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` CHAR(32) NOT NULL PRIMARY KEY,
    `user_id` CHAR(32) DEFAULT NULL,
    `action` VARCHAR(100) NOT NULL,
    `resource_type` VARCHAR(50) NOT NULL DEFAULT '',
    `resource_id` VARCHAR(255) NOT NULL DEFAULT '',
    `ip_address` CHAR(39) DEFAULT NULL,
    `user_agent` LONGTEXT NOT NULL DEFAULT '',
    `metadata` JSON DEFAULT NULL,
    `created_at` DATETIME(6) NOT NULL,
    CONSTRAINT `audit_logs_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `datasets` (
    `id` CHAR(32) NOT NULL PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NOT NULL DEFAULT '',
    `file` VARCHAR(100) NOT NULL,
    `uploaded_by_id` CHAR(32) DEFAULT NULL,
    `record_count` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL,
    CONSTRAINT `datasets_uploaded_by_fk` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `alert_rules` (
    `id` CHAR(32) NOT NULL PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `credibility_threshold` INT NOT NULL DEFAULT 30,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════
-- SimpleJWT Token Blacklist
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `token_blacklist_outstandingtoken` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` CHAR(32) DEFAULT NULL,
    `jti` VARCHAR(255) NOT NULL UNIQUE,
    `token` LONGTEXT NOT NULL,
    `created_at` DATETIME(6) DEFAULT NULL,
    `expires_at` DATETIME(6) NOT NULL,
    CONSTRAINT `token_blacklist_outstanding_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `token_blacklist_blacklistedtoken` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `token_id` BIGINT NOT NULL UNIQUE,
    `blacklisted_at` DATETIME(6) NOT NULL,
    CONSTRAINT `token_blacklist_blacklisted_token_fk` FOREIGN KEY (`token_id`) REFERENCES `token_blacklist_outstandingtoken` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════
-- Django Celery Results
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `django_celery_results_taskresult` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `task_id` VARCHAR(255) NOT NULL UNIQUE,
    `status` VARCHAR(50) NOT NULL,
    `content_type` VARCHAR(128) NOT NULL,
    `content_encoding` VARCHAR(64) NOT NULL,
    `result` LONGTEXT,
    `date_done` DATETIME(6) NOT NULL,
    `traceback` LONGTEXT,
    `meta` LONGTEXT,
    `task_args` LONGTEXT,
    `task_kwargs` LONGTEXT,
    `task_name` VARCHAR(255) DEFAULT NULL,
    `worker` VARCHAR(100) DEFAULT NULL,
    `date_created` DATETIME(6) NOT NULL,
    `periodic_task_name` VARCHAR(255) DEFAULT NULL,
    KEY `django_celery_results_taskresult_task_name` (`task_name`),
    KEY `django_celery_results_taskresult_status` (`status`),
    KEY `django_celery_results_taskresult_worker` (`worker`),
    KEY `django_celery_results_taskresult_date_done` (`date_done`),
    KEY `django_celery_results_taskresult_date_created` (`date_created`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `django_celery_results_chordcounter` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `group_id` VARCHAR(255) NOT NULL UNIQUE,
    `sub_tasks` LONGTEXT NOT NULL,
    `count` INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `django_celery_results_groupresult` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `group_id` VARCHAR(255) NOT NULL UNIQUE,
    `date_done` DATETIME(6) NOT NULL,
    `content_type` VARCHAR(128) NOT NULL,
    `content_encoding` VARCHAR(64) NOT NULL,
    `result` LONGTEXT,
    `date_created` DATETIME(6) NOT NULL,
    KEY `django_celery_results_groupresult_date_done` (`date_done`),
    KEY `django_celery_results_groupresult_date_created` (`date_created`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════
-- Record all Django migrations as applied (fake)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES
('contenttypes', '0001_initial', NOW(6)),
('contenttypes', '0002_remove_content_type_name', NOW(6)),
('auth', '0001_initial', NOW(6)),
('auth', '0002_alter_permission_name_max_length', NOW(6)),
('auth', '0003_alter_user_email_max_length', NOW(6)),
('auth', '0004_alter_user_username_opts', NOW(6)),
('auth', '0005_alter_user_last_login_null', NOW(6)),
('auth', '0006_require_contenttypes_0002', NOW(6)),
('auth', '0007_alter_validators_add_error_messages', NOW(6)),
('auth', '0008_alter_user_username_max_length', NOW(6)),
('auth', '0009_alter_user_last_name_max_length', NOW(6)),
('auth', '0010_alter_group_name_max_length', NOW(6)),
('auth', '0011_update_proxy_permissions', NOW(6)),
('auth', '0012_alter_user_first_name_max_length', NOW(6)),
('accounts', '0001_initial', NOW(6)),
('admin', '0001_initial', NOW(6)),
('admin', '0002_logentry_remove_auto_add', NOW(6)),
('admin', '0003_logentry_add_action_flag_choices', NOW(6)),
('administration', '0001_initial', NOW(6)),
('alerts', '0001_initial', NOW(6)),
('analysis', '0001_initial', NOW(6)),
('analytics', '0001_initial', NOW(6)),
('django_celery_results', '0001_initial', NOW(6)),
('django_celery_results', '0002_add_task_name_args_kwargs', NOW(6)),
('django_celery_results', '0003_auto_20181106_1101', NOW(6)),
('django_celery_results', '0004_auto_20190516_0412', NOW(6)),
('django_celery_results', '0005_taskresult_worker', NOW(6)),
('django_celery_results', '0006_taskresult_date_created', NOW(6)),
('django_celery_results', '0007_remove_taskresult_hidden', NOW(6)),
('django_celery_results', '0008_chordcounter', NOW(6)),
('django_celery_results', '0009_groupresult', NOW(6)),
('django_celery_results', '0010_remove_duplicate_indices', NOW(6)),
('django_celery_results', '0011_taskresult_periodic_task_name', NOW(6)),
('sessions', '0001_initial', NOW(6)),
('token_blacklist', '0001_initial', NOW(6)),
('token_blacklist', '0002_outstandingtoken_jti_hex', NOW(6)),
('token_blacklist', '0003_auto_20171017_2007', NOW(6)),
('token_blacklist', '0004_auto_20171017_2013', NOW(6)),
('token_blacklist', '0005_remove_outstandingtoken_jti', NOW(6)),
('token_blacklist', '0006_auto_20171017_2113', NOW(6)),
('token_blacklist', '0007_auto_20171017_2214', NOW(6)),
('token_blacklist', '0008_alter_outstandingtoken_token', NOW(6)),
('token_blacklist', '0009_alter_outstandingtoken_token', NOW(6)),
('token_blacklist', '0010_fix_migrate_to_bigautofield', NOW(6)),
('token_blacklist', '0011_linearithmic_blacklist', NOW(6)),
('token_blacklist', '0012_alter_outstandingtoken_user', NOW(6));

-- ═══════════════════════════════════════════════════════════════════
-- Populate content types
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO `django_content_type` (`app_label`, `model`) VALUES
('admin', 'logentry'),
('auth', 'permission'),
('auth', 'group'),
('contenttypes', 'contenttype'),
('sessions', 'session'),
('accounts', 'user'),
('accounts', 'apikey'),
('analysis', 'article'),
('analysis', 'analysisresult'),
('alerts', 'alert'),
('alerts', 'notificationpreference'),
('analytics', 'report'),
('administration', 'auditlog'),
('administration', 'dataset'),
('administration', 'alertrule'),
('token_blacklist', 'outstandingtoken'),
('token_blacklist', 'blacklistedtoken'),
('django_celery_results', 'taskresult'),
('django_celery_results', 'chordcounter'),
('django_celery_results', 'groupresult');

SET FOREIGN_KEY_CHECKS = 1;
