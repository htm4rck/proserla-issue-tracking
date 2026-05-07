-- ============================================================================
-- MIGRACIÓN: De tablas "incident" a tablas "inspection"
-- Ejecutar este script UNA VEZ para migrar datos existentes
-- ============================================================================

BEGIN;

-- 1. Migrar datos de incidents a inspections
-- Nota: Las tablas deben haber sido creadas por TypeORM al iniciar la app
INSERT INTO inspections (
  id, "inspectionCode", "reportedBy", "reportedByUserId", "reportYear",
  "reportMonth", "reportDay", "reportTime", site, "reportedPerson",
  "reportedPersonAge", "employerType", "areaCode", "leaderCode",
  "assignedTo", location, "workArea", "inspectionType", "riskLevel",
  description, comment, "reportSource", "correctiveMeasures", status,
  "createdAt", "updatedAt"
)
SELECT 
  id, "incidentCode", "reportedBy", "reportedByUserId", "reportYear",
  "reportMonth", "reportDay", "reportTime", site, "reportedPerson",
  "reportedPersonAge", "employerType", "areaCode", "leaderCode",
  "assignedTo", location, "workArea", "incidentType", "riskLevel",
  description, comment, "reportSource", "correctiveMeasures", status,
  "createdAt", "updatedAt"
FROM incidents
ON CONFLICT (id) DO NOTHING;

-- 2. Migrar datos de incident_images a inspection_images
INSERT INTO inspection_images (
  id, "inspectionCode", "imageType", url, "storagePath", "uploadedBy", "createdAt"
)
SELECT 
  id, "incidentCode", "imageType", url, "storagePath", "uploadedBy", "createdAt"
FROM incident_images
ON CONFLICT (id) DO NOTHING;

-- 3. Migrar datos de incident_images a inspection_responses (nueva estructura)
-- inspection_responses tiene más campos: status, uploadOk, uploadError
INSERT INTO inspection_responses (
  id, "inspectionCode", status, "imageType", url, "storagePath", 
  "uploadedBy", comment, "uploadOk", "createdAt"
)
SELECT 
  id, 
  "incidentCode", 
  -- Derivar el status del tipo de imagen: report = open, closure = closed
  CASE 
    WHEN "imageType" = 'closure' THEN 'closed'
    ELSE 'open'
  END as status,
  "imageType", 
  url, 
  "storagePath", 
  "uploadedBy", 
  NULL as comment, 
  true as "uploadOk",
  "createdAt"
FROM incident_images
WHERE NOT EXISTS (
  SELECT 1 FROM inspection_responses ir WHERE ir.id = incident_images.id
);

-- 4. Migrar datos de incident_serial a inspection_serial
INSERT INTO inspection_serial (year, last_value)
SELECT year, last_value
FROM incident_serial
ON CONFLICT (year) DO UPDATE SET last_value = GREATEST(inspection_serial.last_value, EXCLUDED.last_value);

-- 5. Actualizar códigos de INC- a INS- en inspections
UPDATE inspections 
SET "inspectionCode" = REPLACE("inspectionCode", 'INC-', 'INS-')
WHERE "inspectionCode" LIKE 'INC-%';

-- 6. Actualizar códigos de INC- a INS- en inspection_images
UPDATE inspection_images 
SET "inspectionCode" = REPLACE("inspectionCode", 'INC-', 'INS-')
WHERE "inspectionCode" LIKE 'INC-%';

-- 7. Actualizar códigos de INC- a INS- en inspection_responses
UPDATE inspection_responses 
SET "inspectionCode" = REPLACE("inspectionCode", 'INC-', 'INS-')
WHERE "inspectionCode" LIKE 'INC-%';

-- 8. Actualizar audit_logs: cambiar entityType de 'incident' a 'inspection'
UPDATE audit_logs 
SET "entityType" = 'inspection'
WHERE "entityType" = 'incident';

-- 9. Actualizar entityId en audit_logs: cambiar INC- por INS-
UPDATE audit_logs 
SET "entityId" = REPLACE("entityId", 'INC-', 'INS-')
WHERE "entityId" LIKE 'INC-%';

-- 10. Actualizar catalog_items: cambiar catalogType
UPDATE catalog_items 
SET "catalogType" = 'inspection_type'
WHERE "catalogType" = 'incident_type';

UPDATE catalog_items 
SET "catalogType" = 'inspection_status'
WHERE "catalogType" = 'incident_status';

-- ============================================================================
-- VERIFICACIÓN - Mostrar conteos antes de eliminar tablas antiguas
-- ============================================================================
DO $$
DECLARE
  old_incidents_count INTEGER;
  new_inspections_count INTEGER;
  old_images_count INTEGER;
  new_images_count INTEGER;
  new_responses_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_incidents_count FROM incidents;
  SELECT COUNT(*) INTO new_inspections_count FROM inspections;
  SELECT COUNT(*) INTO old_images_count FROM incident_images;
  SELECT COUNT(*) INTO new_images_count FROM inspection_images;
  SELECT COUNT(*) INTO new_responses_count FROM inspection_responses;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN DE MIGRACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'incidents -> inspections: % -> %', old_incidents_count, new_inspections_count;
  RAISE NOTICE 'incident_images -> inspection_images: % -> %', old_images_count, new_images_count;
  RAISE NOTICE 'inspection_responses: %', new_responses_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- IMPORTANTE: Descomentar las siguientes líneas SOLO después de verificar
-- que la migración fue exitosa. Esto eliminará las tablas antiguas.
-- ============================================================================

-- DROP TABLE IF EXISTS incident_responses;
-- DROP TABLE IF EXISTS incident_images;
-- DROP TABLE IF EXISTS incidents;
-- DROP TABLE IF EXISTS incident_serial;

COMMIT;

-- ============================================================================
-- INSTRUCCIONES:
-- 1. Hacer backup de la base de datos antes de ejecutar
-- 2. Ejecutar este script: psql -U <usuario> -d <base_datos> -f migration-incident-to-inspection.sql
-- 3. Verificar que los conteos coincidan
-- 4. Si todo está correcto, descomentar los DROP TABLE y ejecutar de nuevo
-- ============================================================================
