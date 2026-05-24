-- Missing Person Detection System - Database Initialization
-- Run this to initialize the MySQL database

CREATE DATABASE IF NOT EXISTS mpds CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'mpds_user'@'%' IDENTIFIED BY 'mpds_secret';
GRANT ALL PRIVILEGES ON mpds.* TO 'mpds_user'@'%';
FLUSH PRIVILEGES;

USE mpds;

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;

-- Create indexes for geospatial queries (will be added by migrations)
-- These are hints for the migration files

-- Stored procedure for radius search
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS FindNearbyDetections(
    IN p_lat DECIMAL(10, 8),
    IN p_lng DECIMAL(11, 8),
    IN p_radius_km DECIMAL(10, 2)
)
BEGIN
    SELECT
        d.*,
        mp.full_name AS person_name,
        mp.photo AS person_photo,
        (6371 * acos(
            cos(radians(p_lat)) * cos(radians(d.latitude)) *
            cos(radians(d.longitude) - radians(p_lng)) +
            sin(radians(p_lat)) * sin(radians(d.latitude))
        )) AS distance_km
    FROM detections d
    JOIN missing_persons mp ON d.person_id = mp.id
    WHERE d.latitude IS NOT NULL AND d.longitude IS NOT NULL
    HAVING distance_km <= p_radius_km
    ORDER BY distance_km ASC;
END //

CREATE PROCEDURE IF NOT EXISTS FindNearbySightings(
    IN p_lat DECIMAL(10, 8),
    IN p_lng DECIMAL(11, 8),
    IN p_radius_km DECIMAL(10, 2)
)
BEGIN
    SELECT
        s.*,
        mp.full_name AS person_name,
        mp.photo AS person_photo,
        (6371 * acos(
            cos(radians(p_lat)) * cos(radians(s.latitude)) *
            cos(radians(s.longitude) - radians(p_lng)) +
            sin(radians(p_lat)) * sin(radians(s.latitude))
        )) AS distance_km
    FROM sightings s
    JOIN missing_persons mp ON s.person_id = mp.id
    WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    HAVING distance_km <= p_radius_km
    ORDER BY distance_km ASC;
END //

-- Procedure for case statistics
CREATE PROCEDURE IF NOT EXISTS GetCaseStatistics()
BEGIN
    SELECT
        COUNT(*) AS total_cases,
        SUM(CASE WHEN status = 'missing' THEN 1 ELSE 0 END) AS active_missing,
        SUM(CASE WHEN status = 'under_investigation' THEN 1 ELSE 0 END) AS under_investigation,
        SUM(CASE WHEN status = 'detected' THEN 1 ELSE 0 END) AS detected,
        SUM(CASE WHEN status = 'found_safe' THEN 1 ELSE 0 END) AS found_safe,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN priority_level = 'critical' THEN 1 ELSE 0 END) AS critical_cases,
        SUM(CASE WHEN priority_level = 'high' THEN 1 ELSE 0 END) AS high_priority,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS cases_this_week,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS cases_this_month
    FROM missing_persons
    WHERE deleted_at IS NULL;
END //

-- Procedure for detection trends
CREATE PROCEDURE IF NOT EXISTS GetDetectionTrends(
    IN p_days INT
)
BEGIN
    SELECT
        DATE(created_at) AS detection_date,
        COUNT(*) AS total_detections,
        SUM(CASE WHEN source = 'cctv' THEN 1 ELSE 0 END) AS cctv_detections,
        SUM(CASE WHEN source = 'public_upload' THEN 1 ELSE 0 END) AS public_detections,
        AVG(confidence_score) AS avg_confidence,
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verified_count
    FROM detections
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL p_days DAY)
    GROUP BY DATE(created_at)
    ORDER BY detection_date ASC;
END //

DELIMITER ;

-- Create events for cleanup
CREATE EVENT IF NOT EXISTS cleanup_old_audit_logs
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
    DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

CREATE EVENT IF NOT EXISTS cleanup_read_alerts
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
    DELETE FROM alerts WHERE is_read = 1 AND read_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
