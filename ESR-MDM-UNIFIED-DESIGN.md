# ESR to RDHM Integration - Unified Data Model Design
## MQ Adapter Layer with MDM Screen Integration

**Document Version:** 1.0  
**Date:** March 10, 2026  
**Status:** Draft

---

## 1. Executive Summary

This document outlines the technical design for integrating ESR (Enterprise Structures & Reference) into RDHM's existing MDM screens using a unified data model approach. Instead of creating separate ESR screens, ESR data will be rendered within existing MDM screens with an extended data model that accommodates both ESR's site-code-centric structure and MDM's name-description-based structure.

**Key Design Decisions:**
- Mainframe remains unchanged - no data migration
- MQ Adapter Layer connects RDHM backend to mainframe
- Unified data model extends MDM to support ESR concepts
- Existing MDM screens enhanced to display ESR data
- RDHM approval workflow added (ESR currently has none)

---

## 2. Current Data Model Comparison

### 2.1 Current ESR Data Model (Mainframe)

```
ESR PRIMARY IDENTIFIERS:
┌─────────────────────────────────────────────────────────────┐
│  CATEGORY                                                    │
│  - Primary Key: CATEGORY_CODE + SITE_CODE + AS_AT_DATE      │
│  - Fields: category_code, category_business_name,           │
│            site_code, category_key, as_at_date              │
├─────────────────────────────────────────────────────────────┤
│  GROUPING                                                    │
│  - Primary Key: GROUPING_CODE + SITE_CODE + AS_AT_DATE      │
│  - Fields: grouping_code, grouping_site, category_site,     │
│            category_code, category_key, type (junior/senior)│
├─────────────────────────────────────────────────────────────┤
│  SITE_CODE                                                   │
│  - Primary Key: SITE_CODE                                    │
│  - Fields: site_code, site_name, is_default, region         │
└─────────────────────────────────────────────────────────────┘

KEY CHARACTERISTICS:
- Site code is CENTRAL to all entities
- Data is location-specific (00000 = Enterprise, 00001+ = Local)
- Temporal versioning via as_at_date
- No approval workflow
- Hierarchical via junior/senior relationships
```

### 2.2 Current RDHM MDM Data Model

```
MDM PRIMARY IDENTIFIERS:
┌─────────────────────────────────────────────────────────────┐
│  MDM_ENTITY                                                  │
│  - Primary Key: ENTITY_ID                                    │
│  - Natural Key: MDM_NAME + ENTITY_TYPE                       │
│  - Fields: mdm_name, description, entity_type, status,      │
│            effective_date, end_date, version                 │
├─────────────────────────────────────────────────────────────┤
│  MDM_HIERARCHY                                               │
│  - Primary Key: HIERARCHY_ID                                 │
│  - Fields: parent_entity_id, child_entity_id, hierarchy_type│
├─────────────────────────────────────────────────────────────┤
│  MDM_ATTRIBUTE                                               │
│  - Primary Key: ATTRIBUTE_ID                                 │
│  - Fields: entity_id, attribute_name, attribute_value       │
└─────────────────────────────────────────────────────────────┘

KEY CHARACTERISTICS:
- Name + Description is primary identifier
- Entity-centric (generic entity model)
- No site code concept
- Has approval workflow
- Hierarchical via parent-child relationships
```

### 2.3 Data Model Gap Analysis

| Aspect | ESR Model | MDM Model | Gap |
|--------|-----------|-----------|-----|
| **Primary Key** | Code + Site + Date | Name + Type | Different key structure |
| **Location Scope** | Site Code (00000-99999) | None | MDM lacks site awareness |
| **Temporal** | As-at Date | Effective/End Date | Compatible with mapping |
| **Hierarchy** | Junior/Senior | Parent/Child | Different terminology |
| **Business Name** | Category Business Name | MDM Name | Compatible |
| **Description** | Not explicit | Description | ESR lacks description |
| **Approval** | None | Multi-level | ESR lacks approval |
| **Versioning** | By date | Version number | Different approaches |

---

## 3. Unified Data Model Design

### 3.1 Design Approach: Extended MDM Model

Instead of creating parallel structures, we extend the MDM model to accommodate ESR concepts while maintaining backward compatibility.

```
UNIFIED DATA MODEL STRATEGY:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   EXISTING MDM ENTITY          ESR EXTENSION                │
│   ┌───────────────────┐       ┌───────────────────┐        │
│   │ entity_id (PK)    │       │ esr_code          │        │
│   │ mdm_name          │◄──────│ site_code         │        │
│   │ description       │       │ as_at_date        │        │
│   │ entity_type       │       │ category_key      │        │
│   │ status            │       │ esr_type          │        │
│   │ effective_date    │       │ is_local          │        │
│   │ end_date          │       │ source_system     │        │
│   │ version           │       │                   │        │
│   └───────────────────┘       └───────────────────┘        │
│                                                              │
│   COMBINED PRIMARY KEY FOR ESR DATA:                         │
│   composite_key = mdm_name + site_code + effective_date     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Unified Database Schema

```sql
-- ============================================================
-- OPTION 1: EXTEND EXISTING MDM_ENTITY TABLE (Recommended)
-- ============================================================

-- Add ESR-specific columns to existing MDM_ENTITY table
ALTER TABLE mdm_entity ADD COLUMN site_code VARCHAR(10) DEFAULT '00000';
ALTER TABLE mdm_entity ADD COLUMN esr_code VARCHAR(50);
ALTER TABLE mdm_entity ADD COLUMN esr_key VARCHAR(100);
ALTER TABLE mdm_entity ADD COLUMN is_local BOOLEAN DEFAULT FALSE;
ALTER TABLE mdm_entity ADD COLUMN source_system VARCHAR(20) DEFAULT 'MDM';

-- Create unique constraint for ESR data
CREATE UNIQUE INDEX idx_esr_unique 
ON mdm_entity (esr_code, site_code, effective_date) 
WHERE source_system = 'ESR';

-- Extended MDM_ENTITY table structure:
/*
mdm_entity (
    entity_id           BIGINT PRIMARY KEY,
    mdm_name            VARCHAR(255) NOT NULL,      -- Maps to category_business_name
    description         VARCHAR(500),
    entity_type         VARCHAR(50) NOT NULL,       -- 'CATEGORY', 'GROUPING', 'SITE_CODE'
    status              VARCHAR(20),
    effective_date      DATE,                       -- Maps to as_at_date
    end_date            DATE,
    version             INT DEFAULT 1,
    
    -- ESR Extension Fields
    site_code           VARCHAR(10) DEFAULT '00000', -- ESR site code
    esr_code            VARCHAR(50),                 -- ESR category_code/grouping_code
    esr_key             VARCHAR(100),                -- ESR category_key
    is_local            BOOLEAN DEFAULT FALSE,       -- TRUE if site_code != '00000'
    source_system       VARCHAR(20) DEFAULT 'MDM',   -- 'MDM' or 'ESR'
    
    created_by          VARCHAR(100),
    created_date        TIMESTAMP,
    modified_by         VARCHAR(100),
    modified_date       TIMESTAMP
);
*/

-- ============================================================
-- OPTION 2: SEPARATE ESR EXTENSION TABLE (Alternative)
-- ============================================================

CREATE TABLE mdm_entity_esr_extension (
    extension_id        BIGINT PRIMARY KEY,
    entity_id           BIGINT NOT NULL REFERENCES mdm_entity(entity_id),
    esr_code            VARCHAR(50) NOT NULL,
    site_code           VARCHAR(10) NOT NULL DEFAULT '00000',
    category_key        VARCHAR(100),
    grouping_type       VARCHAR(20),          -- 'JUNIOR', 'SENIOR'
    is_local            BOOLEAN DEFAULT FALSE,
    as_at_date          DATE,
    
    UNIQUE(esr_code, site_code, as_at_date)
);

-- Site code master table (cached from mainframe)
CREATE TABLE esr_site_code_cache (
    site_code           VARCHAR(10) PRIMARY KEY,
    site_name           VARCHAR(255),
    is_default          BOOLEAN DEFAULT FALSE,
    region              VARCHAR(50),
    country_code        VARCHAR(3),
    last_synced         TIMESTAMP,
    sync_status         VARCHAR(20)           -- 'SYNCED', 'PENDING', 'ERROR'
);
```

### 3.3 Data Model Mapping Rules

```
FIELD MAPPING: ESR → MDM
┌────────────────────────┬────────────────────────┬─────────────────────┐
│ ESR Field              │ MDM Field              │ Mapping Rule        │
├────────────────────────┼────────────────────────┼─────────────────────┤
│ category_code          │ esr_code               │ Direct mapping      │
│ category_business_name │ mdm_name               │ Direct mapping      │
│ category_code (display)│ description            │ "ESR: " + code      │
│ site_code              │ site_code (new)        │ Direct mapping      │
│ as_at_date             │ effective_date         │ Direct mapping      │
│ category_key           │ esr_key (new)          │ Direct mapping      │
│ (derived)              │ entity_type            │ 'CATEGORY'          │
│ (derived)              │ is_local               │ site_code != '00000'│
│ (derived)              │ source_system          │ 'ESR'               │
├────────────────────────┼────────────────────────┼─────────────────────┤
│ grouping_code          │ esr_code               │ Direct mapping      │
│ grouping_site          │ site_code (new)        │ Direct mapping      │
│ category_code          │ (via hierarchy)        │ Parent relationship │
│ junior/senior          │ hierarchy_type         │ 'JUNIOR'/'SENIOR'   │
└────────────────────────┴────────────────────────┴─────────────────────┘
```

### 3.4 Composite Key Strategy

```
COMPOSITE KEY FOR UNIQUENESS:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  MDM Native Data:                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ UNIQUE KEY = mdm_name + entity_type                 │   │
│  │ Example: "Product Category A" + "CATEGORY"          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ESR Migrated Data:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ UNIQUE KEY = esr_code + site_code + effective_date  │   │
│  │ Example: "ABC123" + "00001" + "2026-03-10"          │   │
│  │                                                      │   │
│  │ mdm_name = category_business_name (for display)     │   │
│  │ source_system = 'ESR' (to differentiate)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  QUERY STRATEGY:                                            │
│  - MDM screens filter by source_system                      │
│  - ESR view shows source_system = 'ESR'                     │
│  - Combined view shows all                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. MQ Adapter Layer Design

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RDHM Angular Frontend                            │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ENHANCED MDM SCREENS (Existing + ESR Data)                        │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │ │
│  │  │ Entity List     │ │ Entity Detail   │ │ Hierarchy View  │      │ │
│  │  │ + Site Filter   │ │ + ESR Fields    │ │ + Junior/Senior │      │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘      │ │
│  │  ┌─────────────────────────────────────────────────────────┐      │ │
│  │  │ Approval Workflow Panel (Submit/Approve/Reject)         │      │ │
│  │  └─────────────────────────────────────────────────────────┘      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP/REST (JSON)
┌─────────────────────────────────────────────────────────────────────────┐
│                         RDHM Java Backend                                │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  REST Controller Layer                                             │ │
│  │  - GET  /api/mdm/entities?source=ESR&siteCode=00001              │ │
│  │  - POST /api/mdm/entities (with ESR extension)                    │ │
│  │  - GET  /api/mdm/entities/{id}/esr-details                       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  MDM Service Layer (Enhanced)                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │ EntityService                                                │  │ │
│  │  │ - getEntities(filter)     // Works for both MDM & ESR       │  │ │
│  │  │ - createEntity(request)   // Routes based on source_system  │  │ │
│  │  │ - updateEntity(request)   // Routes based on source_system  │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  │                           │                                        │ │
│  │         ┌─────────────────┴─────────────────┐                     │ │
│  │         ▼                                   ▼                     │ │
│  │  ┌─────────────────┐              ┌─────────────────────────┐    │ │
│  │  │ MDM Repository  │              │ ESR MQ Adapter Service  │    │ │
│  │  │ (Database)      │              │ (Mainframe Connection)  │    │ │
│  │  └─────────────────┘              └─────────────────────────┘    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                   │                     │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Approval Workflow Service (Existing RDHM)                        │ │
│  │  - Intercepts CREATE/UPDATE/DELETE for ESR data                   │ │
│  │  - Creates approval request                                        │ │
│  │  - On approval → triggers MQ Adapter to execute on mainframe      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                   │                     │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  *** MQ ADAPTER SERVICE (New Component) ***                       │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │ 1. Request Transformer                                      │  │ │
│  │  │    - MDM Entity → ESR MQ Message                            │  │ │
│  │  │    - Add correlation ID, headers                            │  │ │
│  │  ├─────────────────────────────────────────────────────────────┤  │ │
│  │  │ 2. MQ Connection Manager                                    │  │ │
│  │  │    - Connection pool to MQ (IBM MQ JMS)                     │  │ │
│  │  │    - Failover between MBG1/MBG2/MBG3                        │  │ │
│  │  ├─────────────────────────────────────────────────────────────┤  │ │
│  │  │ 3. Message Handler                                          │  │ │
│  │  │    - Put to request queue                                   │  │ │
│  │  │    - Get from response queue (with timeout)                 │  │ │
│  │  ├─────────────────────────────────────────────────────────────┤  │ │
│  │  │ 4. Response Transformer                                     │  │ │
│  │  │    - ESR Response → MDM Entity format                       │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ IBM MQ Protocol (JMS)
┌─────────────────────────────────────────────────────────────────────────┐
│                    ESR MQ Configuration (Mainframe - UNCHANGED)          │
│                                                                          │
│  Queue Managers: MBG1.on.MBG3, MBG2.on.MBG3, MBG3.on.MBG3              │
│  Request Queue:  QA.ESR.CUPUT07.QB.ESR.DBMGR.RQST                       │
│  Response Queue: QA.ESR.CUPUT07.QB.ESR.DBMGR.RSPD                       │
│                                                                          │
│  ESR Business Logic (COBOL) → DB2 Database (Data stays here)           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 MQ Adapter Service Implementation

```java
@Service
public class EsrMqAdapterService {

    @Autowired
    private JmsTemplate jmsTemplate;
    
    @Autowired
    private EsrMessageTransformer messageTransformer;
    
    @Value("${esr.mq.request-queue}")
    private String requestQueue;
    
    @Value("${esr.mq.response-queue}")
    private String responseQueue;
    
    @Value("${esr.mq.timeout:30000}")
    private long timeout;

    /**
     * Search categories from mainframe via MQ
     */
    public List<MdmEntity> searchCategories(EsrSearchRequest request) {
        // 1. Transform to MQ message format
        String mqMessage = messageTransformer.toMqSearchMessage(request);
        String correlationId = UUID.randomUUID().toString();
        
        // 2. Send to request queue
        jmsTemplate.send(requestQueue, session -> {
            TextMessage message = session.createTextMessage(mqMessage);
            message.setJMSCorrelationID(correlationId);
            message.setStringProperty("OPERATION", "SEARCH_CATEGORY");
            return message;
        });
        
        // 3. Wait for response
        String selector = "JMSCorrelationID='" + correlationId + "'";
        Message response = jmsTemplate.receiveSelected(responseQueue, selector);
        
        // 4. Transform response to MDM entities
        return messageTransformer.toMdmEntities(((TextMessage) response).getText());
    }

    /**
     * Execute create/update/delete on mainframe (called after approval)
     */
    public EsrExecutionResult executeOnMainframe(MdmEntity entity, String operation) {
        // Transform MDM entity to ESR MQ format
        String mqMessage = messageTransformer.toMqExecuteMessage(entity, operation);
        String correlationId = UUID.randomUUID().toString();
        
        // Send and receive
        jmsTemplate.send(requestQueue, session -> {
            TextMessage message = session.createTextMessage(mqMessage);
            message.setJMSCorrelationID(correlationId);
            message.setStringProperty("OPERATION", operation);
            return message;
        });
        
        Message response = jmsTemplate.receiveSelected(responseQueue, 
            "JMSCorrelationID='" + correlationId + "'");
        
        return messageTransformer.toExecutionResult(response);
    }
}
```

### 4.3 Message Transformer

```java
@Component
public class EsrMessageTransformer {

    /**
     * Transform MDM Entity to ESR MQ Message Format
     */
    public String toMqExecuteMessage(MdmEntity entity, String operation) {
        EsrMqMessage mqMessage = new EsrMqMessage();
        mqMessage.setOperation(operation);  // CREATE_CATEGORY, UPDATE_CATEGORY, etc.
        mqMessage.setCategoryCode(entity.getEsrCode());
        mqMessage.setCategoryBusinessName(entity.getMdmName());
        mqMessage.setSiteCode(entity.getSiteCode());
        mqMessage.setAsAtDate(entity.getEffectiveDate());
        mqMessage.setCategoryKey(entity.getEsrKey());
        
        return convertToMqFormat(mqMessage);  // Convert to mainframe-expected format
    }

    /**
     * Transform MQ Response to MDM Entity list
     */
    public List<MdmEntity> toMdmEntities(String mqResponse) {
        List<MdmEntity> entities = new ArrayList<>();
        
        // Parse mainframe response format
        List<EsrCategoryData> esrDataList = parseMqResponse(mqResponse);
        
        for (EsrCategoryData esrData : esrDataList) {
            MdmEntity entity = new MdmEntity();
            entity.setMdmName(esrData.getCategoryBusinessName());
            entity.setDescription("ESR Category: " + esrData.getCategoryCode());
            entity.setEntityType("CATEGORY");
            entity.setEsrCode(esrData.getCategoryCode());
            entity.setSiteCode(esrData.getSiteCode());
            entity.setEsrKey(esrData.getCategoryKey());
            entity.setEffectiveDate(esrData.getAsAtDate());
            entity.setIsLocal(!esrData.getSiteCode().equals("00000"));
            entity.setSourceSystem("ESR");
            entities.add(entity);
        }
        
        return entities;
    }
}
```

---

## 5. Approval Workflow Integration

### 5.1 Flow: ESR Operations with Approval

```
ESR OPERATION FLOW (With RDHM Approval):
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  1. USER INITIATES CHANGE (via MDM Screen)                              │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ User fills form:                                             │    │
│     │ - Category Code: ABC123                                      │    │
│     │ - Business Name: Sample Category                             │    │
│     │ - Site Code: 00001 (dropdown)                                │    │
│     │ - As-at Date: 2026-03-10                                     │    │
│     │ Clicks: [Submit for Approval]                                │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  2. APPROVAL REQUEST CREATED (Stored in RDHM Database)                  │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ Approval Request:                                            │    │
│     │ - request_id: 12345                                          │    │
│     │ - entity_data: {JSON payload}                                │    │
│     │ - operation: CREATE_CATEGORY                                 │    │
│     │ - status: PENDING_APPROVAL                                   │    │
│     │ - submitted_by: user@hsbc.com                               │    │
│     │ - submitted_date: 2026-03-10 10:30:00                       │    │
│     │                                                              │    │
│     │ NOTE: Data NOT sent to mainframe yet                         │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  3. APPROVER REVIEWS & APPROVES                                         │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ Approver sees pending request in dashboard                   │    │
│     │ Reviews: Category ABC123 for Site 00001                      │    │
│     │ Clicks: [Approve] or [Reject]                                │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                         ┌─────────┴─────────┐                           │
│                         ▼                   ▼                           │
│                    [APPROVED]           [REJECTED]                      │
│                         │                   │                           │
│                         ▼                   ▼                           │
│  4A. EXECUTE ON MAINFRAME          4B. NOTIFY USER                      │
│     ┌───────────────────────┐     ┌───────────────────────┐            │
│     │ MQ Adapter sends      │     │ Email notification    │            │
│     │ message to mainframe  │     │ Status: REJECTED      │            │
│     │                       │     │ Reason: "..."         │            │
│     │ Queue: ESR.RQST       │     └───────────────────────┘            │
│     │ Operation: CREATE     │                                           │
│     └───────────────────────┘                                           │
│                         │                                                │
│                         ▼                                                │
│  5. MAINFRAME PROCESSES & RESPONDS                                      │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ Mainframe:                                                   │    │
│     │ - Validates data                                             │    │
│     │ - Executes COBOL business logic                              │    │
│     │ - Persists to DB2                                            │    │
│     │ - Returns SUCCESS/FAILURE                                    │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                         │                                                │
│                         ▼                                                │
│  6. UPDATE STATUS & NOTIFY                                              │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ - Update approval request status: COMPLETED                  │    │
│     │ - Log audit entry                                            │    │
│     │ - Notify user: "Category ABC123 created successfully"        │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Approval Workflow Service Enhancement

```java
@Service
public class EsrApprovalWorkflowService {

    @Autowired
    private ApprovalRequestRepository approvalRepo;
    
    @Autowired
    private EsrMqAdapterService mqAdapter;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private AuditService auditService;

    /**
     * Submit ESR change for approval (Step 1-2)
     */
    @Transactional
    public ApprovalRequest submitForApproval(MdmEntity entity, String operation, String userId) {
        // Validate entity has ESR source
        if (!"ESR".equals(entity.getSourceSystem())) {
            throw new InvalidRequestException("Entity is not ESR type");
        }
        
        // Create approval request (data stored in RDHM DB, NOT sent to mainframe)
        ApprovalRequest request = new ApprovalRequest();
        request.setEntityData(serializeEntity(entity));
        request.setOperation(operation);  // CREATE_CATEGORY, UPDATE_CATEGORY, DELETE_CATEGORY
        request.setStatus(ApprovalStatus.PENDING);
        request.setSubmittedBy(userId);
        request.setSubmittedDate(LocalDateTime.now());
        request.setApprovalLevel(determineApprovalLevel(operation));
        request.setEntityType(entity.getEntityType());
        request.setSiteCode(entity.getSiteCode());  // Important for routing
        
        approvalRepo.save(request);
        
        // Notify approvers
        notificationService.notifyApprovers(request);
        
        // Audit log
        auditService.log(entity, "SUBMITTED_FOR_APPROVAL", userId);
        
        return request;
    }

    /**
     * Approve request and execute on mainframe (Step 3-4A)
     */
    @Transactional
    public void approveAndExecute(Long requestId, String approverId) {
        ApprovalRequest request = approvalRepo.findById(requestId)
            .orElseThrow(() -> new NotFoundException("Request not found"));
        
        // Update approval status
        request.setStatus(ApprovalStatus.APPROVED);
        request.setApprovedBy(approverId);
        request.setApprovedDate(LocalDateTime.now());
        approvalRepo.save(request);
        
        // Deserialize entity and execute on mainframe
        MdmEntity entity = deserializeEntity(request.getEntityData());
        EsrExecutionResult result = mqAdapter.executeOnMainframe(entity, request.getOperation());
        
        if (result.isSuccess()) {
            request.setStatus(ApprovalStatus.COMPLETED);
            notificationService.notifySuccess(request);
        } else {
            request.setStatus(ApprovalStatus.EXECUTION_FAILED);
            request.setErrorMessage(result.getErrorMessage());
            notificationService.notifyFailure(request);
        }
        
        approvalRepo.save(request);
        auditService.log(entity, "EXECUTED_ON_MAINFRAME", approverId, result);
    }

    /**
     * Reject request (Step 4B)
     */
    @Transactional
    public void reject(Long requestId, String approverId, String reason) {
        ApprovalRequest request = approvalRepo.findById(requestId)
            .orElseThrow(() -> new NotFoundException("Request not found"));
        
        request.setStatus(ApprovalStatus.REJECTED);
        request.setApprovedBy(approverId);
        request.setApprovedDate(LocalDateTime.now());
        request.setRejectionReason(reason);
        approvalRepo.save(request);
        
        notificationService.notifyRejection(request);
        auditService.log(null, "APPROVAL_REJECTED", approverId, reason);
    }

    private int determineApprovalLevel(String operation) {
        // DELETE requires L2 approval, others L1
        return operation.startsWith("DELETE") ? 2 : 1;
    }
}
```

### 5.3 Approval Database Tables

```sql
-- ESR Approval Request Table (extends existing RDHM approval)
CREATE TABLE esr_approval_request (
    request_id          BIGINT PRIMARY KEY,
    entity_data         TEXT NOT NULL,           -- JSON serialized entity
    operation           VARCHAR(50) NOT NULL,    -- CREATE_CATEGORY, UPDATE, DELETE
    entity_type         VARCHAR(50),             -- CATEGORY, GROUPING
    site_code           VARCHAR(10),             -- For routing/filtering
    status              VARCHAR(30) NOT NULL,    -- PENDING, APPROVED, REJECTED, COMPLETED, FAILED
    approval_level      INT DEFAULT 1,           -- 1 = L1, 2 = L2
    submitted_by        VARCHAR(100) NOT NULL,
    submitted_date      TIMESTAMP NOT NULL,
    approved_by         VARCHAR(100),
    approved_date       TIMESTAMP,
    rejection_reason    TEXT,
    error_message       TEXT,                    -- If mainframe execution fails
    mq_correlation_id   VARCHAR(100),            -- For tracking MQ messages
    created_date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approval Audit Trail
CREATE TABLE esr_approval_audit (
    audit_id            BIGINT PRIMARY KEY,
    request_id          BIGINT REFERENCES esr_approval_request(request_id),
    action              VARCHAR(50),             -- SUBMITTED, APPROVED, REJECTED, EXECUTED
    action_by           VARCHAR(100),
    action_date         TIMESTAMP,
    details             TEXT                     -- JSON with additional details
);
```

---

## 6. MDM Screen Enhancement for ESR Data

### 6.1 UI Changes Required

```
ENHANCED MDM ENTITY LIST SCREEN:
┌─────────────────────────────────────────────────────────────────────────┐
│  Entity Management                                          [+ Add New] │
├─────────────────────────────────────────────────────────────────────────┤
│  Filters:                                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Type: All  ▼│ │Source: All▼│ │Site Code:▼ │ │ As-at Date  │       │
│  │ - CATEGORY  │ │ - MDM       │ │ - 00000    │ │ [📅]        │       │
│  │ - GROUPING  │ │ - ESR       │ │ - 00001    │ └─────────────┘       │
│  └─────────────┘ └─────────────┘ │ - 00002    │                        │
│                                   └─────────────┘                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────┬──────────────┬──────────┬───────────┬────────┬───────────┐ │
│  │ Code   │ Name         │ Type     │ Site Code │ Source │ Status    │ │
│  ├────────┼──────────────┼──────────┼───────────┼────────┼───────────┤ │
│  │ ABC123 │ Category A   │ CATEGORY │ 00001     │ ESR    │ Active    │ │
│  │ DEF456 │ Category B   │ CATEGORY │ 00000     │ ESR    │ Active    │ │
│  │ --     │ Product MDM  │ ENTITY   │ --        │ MDM    │ Active    │ │
│  │ GRP001 │ Group Alpha  │ GROUPING │ 00001     │ ESR    │ Pending   │ │
│  └────────┴──────────────┴──────────┴───────────┴────────┴───────────┘ │
└─────────────────────────────────────────────────────────────────────────┘

ENHANCED ENTITY DETAIL SCREEN (When source=ESR):
┌─────────────────────────────────────────────────────────────────────────┐
│  Entity Details                                    [Edit] [Delete]      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ STANDARD MDM FIELDS                                              │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │ │ Name            │  │ Description     │  │ Entity Type     │   │   │
│  │ │ [Category A   ] │  │ [ESR: ABC123  ] │  │ [CATEGORY     ] │   │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘   │   │
│  │ ┌─────────────────┐  ┌─────────────────┐                         │   │
│  │ │ Effective Date  │  │ Status          │                         │   │
│  │ │ [2026-03-10   ] │  │ [Active       ] │                         │   │
│  │ └─────────────────┘  └─────────────────┘                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ESR EXTENSION FIELDS (Shown when source_system = 'ESR')         │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │ │ ESR Code        │  │ Site Code       │  │ Category Key    │   │   │
│  │ │ [ABC123       ] │  │ [00001       ▼] │  │ [12345        ] │   │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘   │   │
│  │ ┌─────────────────┐  ┌─────────────────┐                         │   │
│  │ │ Scope           │  │ Source System   │                         │   │
│  │ │ [● Local ○ Ent] │  │ [ESR - Locked ] │                         │   │
│  │ └─────────────────┘  └─────────────────┘                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ APPROVAL STATUS                                                  │   │
│  │ Status: Pending Approval | Submitted by: user@hsbc.com          │   │
│  │ Submitted: 2026-03-10 10:30 | Awaiting: L1 Approval             │   │
│  │                                                                  │   │
│  │ [Approve]  [Reject]  [View History]                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Angular Component Changes

```typescript
// Enhanced Entity Model
export interface MdmEntity {
  // Standard MDM fields
  entityId: number;
  mdmName: string;
  description: string;
  entityType: string;
  status: string;
  effectiveDate: Date;
  endDate: Date;
  version: number;
  
  // ESR Extension fields (nullable for MDM-only entities)
  siteCode?: string;
  esrCode?: string;
  esrKey?: string;
  isLocal?: boolean;
  sourceSystem: 'MDM' | 'ESR';
}

// Enhanced Entity List Component
@Component({
  selector: 'app-entity-list',
  template: `
    <div class="filters">
      <select [(ngModel)]="filters.entityType">
        <option value="">All Types</option>
        <option value="CATEGORY">Category</option>
        <option value="GROUPING">Grouping</option>
      </select>
      
      <!-- NEW: Source System Filter -->
      <select [(ngModel)]="filters.sourceSystem">
        <option value="">All Sources</option>
        <option value="MDM">MDM</option>
        <option value="ESR">ESR</option>
      </select>
      
      <!-- NEW: Site Code Filter (for ESR) -->
      <select [(ngModel)]="filters.siteCode" *ngIf="filters.sourceSystem === 'ESR'">
        <option value="">All Sites</option>
        <option *ngFor="let site of siteCodes" [value]="site.code">
          {{site.code}} - {{site.name}}
        </option>
      </select>
    </div>
    
    <table>
      <tr *ngFor="let entity of entities">
        <td>{{entity.esrCode || '--'}}</td>
        <td>{{entity.mdmName}}</td>
        <td>{{entity.entityType}}</td>
        <td>{{entity.siteCode || '--'}}</td>
        <td><span [class]="entity.sourceSystem">{{entity.sourceSystem}}</span></td>
        <td>{{entity.status}}</td>
      </tr>
    </table>
  `
})
export class EntityListComponent {
  filters = {
    entityType: '',
    sourceSystem: '',
    siteCode: ''
  };
  siteCodes: SiteCode[] = [];
  entities: MdmEntity[] = [];
  
  loadEntities() {
    this.entityService.getEntities(this.filters).subscribe(data => {
      this.entities = data;
    });
  }
}
```

---

## 7. Summary: Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Extend MDM model, don't replace** | Minimal disruption, reuse existing screens |
| **Add site_code to MDM entity** | Core ESR concept, needed for uniqueness |
| **source_system discriminator** | Distinguish ESR vs MDM data in queries |
| **Composite key for ESR** | esr_code + site_code + effective_date |
| **MQ Adapter in backend** | Bridge between REST and mainframe MQ |
| **Approval before MQ execution** | ESR lacks approval; RDHM provides it |
| **Cache site codes locally** | Reduce mainframe calls for dropdowns |
| **No data migration** | Mainframe remains source of truth |

---

## 8. Effort Estimation

| Component | Effort (Days) | Team |
|-----------|---------------|------|
| Database schema extension | 3 | Backend |
| MQ Adapter Service | 15 | Backend |
| Message Transformers | 8 | Backend |
| Approval Workflow Enhancement | 10 | Backend |
| REST API Updates | 5 | Backend |
| MDM Screen Enhancements | 12 | Frontend |
| Site Code Management | 3 | Full-stack |
| Integration Testing | 10 | QA |
| UAT | 5 | QA |
| **Total** | **71 days** | **~4 months** |

---

*End of Document*
