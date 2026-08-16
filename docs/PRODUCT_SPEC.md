# Tordo One — Especificación de Producto

---

## 1. Gestión Operacional

### Objetivo

Digitalizar la operación diaria de planta.

### Funcionalidades

- Bitácoras digitales
- Rondas operativas
- Entrega de turnos
- Checklists operativos
- Inspecciones
- Evidencias fotográficas
- Firma digital
- Geolocalización

### Entidades

```
OperationLog
Shift
ShiftHandover
Checklist
ChecklistTemplate
Inspection
InspectionAnswer
InspectionEvidence
```

---

## 2. Hallazgos Operacionales

### Objetivo

Centralizar cualquier desviación detectada durante la operación.

### Tipos de Hallazgos

- Incidente
- Condición insegura
- Acto inseguro
- Near Miss
- No conformidad
- Falla operacional
- Observación
- Reclamo interno
- Desviación de proceso

### Entidades

```
OperationalFinding
FindingType
FindingCategory
FindingStatus
FindingPriority
FindingRisk
FindingAssignment
FindingComment
FindingEvidence
FindingHistory
```

---

## 3. Gestión CAPA

### Objetivo

Gestionar acciones correctivas y preventivas.

### Funcionalidades

- Análisis causa raíz
- Metodología 5 Why
- Diagrama Ishikawa
- Acciones correctivas
- Acciones preventivas
- Validación
- Revisión de efectividad

### Entidades

```
CapaCase
RootCauseAnalysis
CorrectiveAction
PreventiveAction
ActionTask
Validation
EffectivenessReview
```

---

## 4. Seguridad Industrial (HSE)

### Objetivo

Gestionar riesgos y eventos de seguridad.

### Funcionalidades

- Accidentes
- Incidentes
- Near Miss
- Observaciones SST
- Gestión EPP
- Matriz IPERC
- Evaluación de riesgos

### Entidades

```
Hazard
RiskAssessment
Accident
Incident
NearMiss
PPEControl
RiskMatrix
```

---

## 5. Calidad

### Objetivo

Controlar la calidad del producto y procesos.

### Funcionalidades

- Inspecciones de calidad
- No conformidades
- Control de defectos
- Control de lotes
- Liberación de producto
- Gestión de reclamos

### Entidades

```
Product
Batch
QualityInspection
Defect
NonConformity
QualityRelease
CustomerComplaint
SupplierComplaint
```

---

## 6. Mantenimiento

### Objetivo

Gestionar activos y mantenimiento.

### Funcionalidades

- Registro de activos
- Gestión de equipos
- Mantenimiento preventivo
- Mantenimiento correctivo
- Mantenimiento predictivo
- Órdenes de trabajo

### Entidades

```
Asset
Equipment
FailureReport
WorkOrder
MaintenancePlan
MaintenanceTask
MaintenanceSchedule
```

---

## 7. Auditorías

### Objetivo

Gestionar auditorías internas y externas.

### Funcionalidades

- Auditorías ISO
- Auditorías BRC
- Auditorías HACCP
- Auditorías internas
- Hallazgos
- Planes de acción

### Entidades

```
Audit
AuditQuestion
AuditAnswer
AuditFinding
AuditEvidence
AuditActionPlan
```

---

## 8. Workflow Engine

### Objetivo

Permitir configurar flujos de aprobación por empresa.

### Funcionalidades

- Flujos configurables
- Aprobaciones multinivel
- Rechazos
- Escalamientos
- SLA

### Entidades

```
Workflow
WorkflowStep
WorkflowTransition
WorkflowInstance
Approval
EscalationRule
```

---

## 9. Analytics & KPIs

### Objetivo

Proporcionar indicadores operacionales en tiempo real.

### KPIs Operacionales

- Hallazgos por planta
- Hallazgos por área
- Hallazgos por categoría
- Hallazgos vencidos

### KPIs Calidad

- No conformidades
- Defectos por lote
- Acciones vencidas

### KPIs Seguridad

- Accidentes
- Near Miss
- Índice de frecuencia
- Índice de severidad

### KPIs Mantenimiento

- MTTR
- MTBF
- Disponibilidad
- Cumplimiento de mantenimiento

### Entidades

```
Dashboard
KpiDefinition
KpiResult
Metric
Report
```

---

## 10. Inteligencia Artificial

### Objetivo

Automatizar clasificación, análisis y recomendaciones.

### Análisis de Imágenes

- Detección de derrames
- Uso incorrecto de EPP
- Condiciones inseguras
- Defectos de producto

### Clasificación Automática

- Tipo de hallazgo
- Severidad
- Riesgo
- Área sugerida

### Recomendaciones

- Acciones correctivas sugeridas
- Priorización automática
- Predicción de riesgos

### Entidades

```
AiAnalysis
AiClassification
AiSuggestion
AiPrediction
```

---

## Integraciones

### SAP

| Módulo | Casos de uso |
|--------|--------------|
| SAP PM | Crear orden de mantenimiento |
| SAP QM | Crear notificación de calidad |
| SAP EHS | Sincronizar eventos de seguridad |
| SAP HR | Sincronizar personal |

### Odoo

| Módulo | Casos de uso |
|--------|--------------|
| Maintenance | Crear órdenes de mantenimiento |
| Quality | Sincronizar inspecciones |
| Employees | Sincronizar empleados |
| Inventory | Sincronizar productos |

### Microsoft

- Azure AD (SSO)
- Microsoft Teams (notificaciones)
- Power BI (reportes)

### Google

- Google Workspace (SSO)
- Google Maps (geolocalización)
- Google Drive (almacenamiento)
