-- ============================================================================
-- MIGRACIÓN: De tablas "incident" a tablas "inspection"
-- Ejecutar este script UNA VEZ para migrar datos existentes
-- ============================================================================

ROLLBACK;

BEGIN;

-- 1. Migrar incidents → inspections
--    status: incidents_status_enum → inspections_status_enum (via text)
INSERT INTO inspections (
  id, "inspectionCode", "reportedBy", "reportedByUserId",
  "reportYear", "reportMonth", "reportDay", "reportTime",
  site, "reportedPerson", "reportedPersonAge", "employerType",
  "areaCode", "leaderCode", "assignedTo", location, "workArea",
  "inspectionType", "riskLevel", description, comment,
  "reportSource", "correctiveMeasures", status,
  "createdAt", "updatedAt"
)
SELECT
  id, "incidentCode", "reportedBy", "reportedByUserId",
  "reportYear", "reportMonth", "reportDay", "reportTime",
  site, "reportedPerson", "reportedPersonAge", "employerType",
  "areaCode", "leaderCode", "assignedTo", location, "workArea",
  CAST("incidentType" AS text),
  "riskLevel", description, comment,
  "reportSource", "correctiveMeasures",
  CAST(CAST(status AS text) AS inspections_status_enum),
  "createdAt", "updatedAt"
FROM incidents
ON CONFLICT (id) DO NOTHING;

-- 2. Migrar incident_images → inspection_images
--    imageType: incident_images_imagetype_enum → inspection_images_imagetype_enum (via text)
INSERT INTO inspection_images (
  id, "inspectionCode", "imageType", url, "storagePath", "uploadedBy", "createdAt"
)
SELECT
  id, "incidentCode",
  CAST(CAST("imageType" AS text) AS inspection_images_imagetype_enum),
  url, "storagePath", "uploadedBy", "createdAt"
FROM incident_images
ON CONFLICT (id) DO NOTHING;

-- 3. Migrar incident_images → inspection_responses (estructura extendida)
--    status: derivado del imageType, cast a inspection_responses_status_enum
--    imageType: varchar(30) en inspection_responses, cast a text directo
INSERT INTO inspection_responses (
  id, "inspectionCode", status, "imageType", url,
  "storagePath", "uploadedBy", comment, "uploadOk", "createdAt"
)
SELECT
  id,
  "incidentCode",
  CAST(
    CASE WHEN CAST("imageType" AS text) = 'closure' THEN 'closed' ELSE 'open' END
    AS inspection_responses_status_enum
  ),
  CAST("imageType" AS text),
  url, "storagePath", "uploadedBy",
  NULL,
  true,
  "createdAt"
FROM incident_images
WHERE NOT EXISTS (
  SELECT 1 FROM inspection_responses ir WHERE ir.id = incident_images.id
);

-- 4. Migrar incident_serial → inspection_serial
INSERT INTO inspection_serial (year, last_value)
SELECT year, last_value
FROM incident_serial
ON CONFLICT (year) DO UPDATE
  SET last_value = GREATEST(inspection_serial.last_value, EXCLUDED.last_value);

-- 5. Renombrar códigos INC- → INS- en inspections
UPDATE inspections
SET "inspectionCode" = REPLACE("inspectionCode", 'INC-', 'INS-')
WHERE "inspectionCode" LIKE 'INC-%';

-- 6. Renombrar códigos INC- → INS- en inspection_images
UPDATE inspection_images
SET "inspectionCode" = REPLACE("inspectionCode", 'INC-', 'INS-')
WHERE "inspectionCode" LIKE 'INC-%';

-- 7. Renombrar códigos INC- → INS- en inspection_responses
UPDATE inspection_responses
SET "inspectionCode" = REPLACE("inspectionCode", 'INC-', 'INS-')
WHERE "inspectionCode" LIKE 'INC-%';

-- 8. audit_logs: entityType
UPDATE audit_logs SET "entityType" = 'inspection' WHERE "entityType" = 'incident';

-- 9. audit_logs: entityId con código INC-
UPDATE audit_logs
SET "entityId" = REPLACE("entityId", 'INC-', 'INS-')
WHERE "entityId" LIKE 'INC-%';

-- 10. catalog_items
UPDATE catalog_items SET "catalogType" = 'inspection_type'   WHERE "catalogType" = 'incident_type';
UPDATE catalog_items SET "catalogType" = 'inspection_status' WHERE "catalogType" = 'incident_status';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT
  (SELECT COUNT(*) FROM incidents)            AS incidents_origen,
  (SELECT COUNT(*) FROM inspections)          AS inspections_destino,
  (SELECT COUNT(*) FROM incident_images)      AS incident_images_origen,
  (SELECT COUNT(*) FROM inspection_images)    AS inspection_images_destino,
  (SELECT COUNT(*) FROM inspection_responses) AS inspection_responses_destino;

-- ============================================================================
-- Descomentar SOLO después de verificar que los conteos coincidan
-- ============================================================================
-- DROP TABLE IF EXISTS incident_responses;
-- DROP TABLE IF EXISTS incident_images;
-- DROP TABLE IF EXISTS incidents;
-- DROP TABLE IF EXISTS incident_serial;

COMMIT;
