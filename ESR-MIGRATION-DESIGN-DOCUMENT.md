# ESR to RDHM Migration - Design Document
## MQ Adapter Layer Approach with Approval Workflow Integration

## Executive Summary

This document outlines the technical design for integrating Enterprise Structures & Reference (ESR) functionality into the Reference Data Hierarchy Management (RDHM) application using an **MQ Adapter Layer** approach. ESR is being decommissioned as a standalone UI, but the mainframe backend and MQ infrastructure will remain operational due to existing data complexity and dependencies.

**Solution Approach:** Create an intermediate adapter layer in RDHM's Java backend that connects to the existing ESR MQ mainframe infrastructure while adding RDHM's approval workflow capabilities.

**Document Version:** 2.0  
**Date:** March 10, 2026  
**Status:** Draft

---

## 1. Current ESR Architecture (As-Is)

### 1.1 ESR System Overview

ESR (Enterprise Structures & Reference) is a mainframe-based system that manages:
- **Category Data:** Business categories and their hierarchical structures
- **Grouping Data:** Grouping of categories (Junior/Senior relationships)
- **Site Codes:** Location-specific reference data
- **Category Structures:** Hierarchical relationships between categories

### 1.2 Current ESR Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESR Frontend (Servlet-based)                  │
│  - Category Data Servlet                                         │
│  - Category Structure Servlet                                    │
│  - Grouping Data Servlet                                         │
│  - Grouping Structure Servlet                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓ Direct MQ Binding
┌─────────────────────────────────────────────────────────────────┐
│              MQ Configuration Layer (Mainframe)                  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Queue Managers (SYSB OSI Queue Managers)                 │ │
│  │  - MBG1.on.MBG3 (Primary)                                 │ │
│  │  - MBG2.on.MBG3 (Secondary)                               │ │
│  │  - MBG3.on.MBG3 (Tertiary)                                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Request Queues                                           │ │
│  │  - QA.ESR.CUPUT07.QB.ESR.DBMGR.RQST                      │ │
│  │  - QB.ESR.CUPUT07.QB.ESR.DBMGR.RQST                      │ │
│  │  - QB.GBI.GB.GBI.DBMGR.RQST                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Response Queues                                          │ │
│  │  - QA.ESR.CUPUT07.QB.ESR.DBMGR.RSPD                      │ │
│  │  - QB.ESR.CUPUT07.QB.ESR.DBMGR.RSPD                      │ │
│  │  - QB.GBI.GB.GBI.DBMGR.RSPD                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  ESR Groups & Channels                                    │ │
│  │  - QMGR: QMGR1                                            │ │
│  │  - ServiceId: downstreamDelivery                          │ │
│  │  - Operational: messageDelivery                           │ │
│  │  - Problems: DAFC2RP01.UK                                 │ │
│  │  - ESR Groups: GBRS5                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              Mainframe Database (DB2/IMS)                        │
│  - Category Master Tables                                        │
│  - Grouping Master Tables                                        │
│  - Site Code Tables                                              │
│  - Historical Data (Years of accumulated data)                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Current ESR Data Flow

**Example: Category Data Search**

```
1. User enters Category Code in ESR Servlet UI
   ↓
2. Servlet creates MQ Request Message
   Message Format:
   {
     "operation": "SEARCH_CATEGORY",
     "categoryCode": "ABC123",
     "siteCode": "00001",
     "asAtDate": "2026-03-10"
   }
   ↓
3. Message sent to Request Queue
   Queue: QA.ESR.CUPUT07.QB.ESR.DBMGR.RQST
   ↓
4. Queue Manager routes to appropriate handler
   Queue Manager: MBG1.on.MBG3
   ↓
5. Mainframe processes request
   - Queries DB2 database
   - Applies business logic
   - Formats response
   ↓
6. Response sent to Response Queue
   Queue: QA.ESR.CUPUT07.QB.ESR.DBMGR.RSPD
   ↓
7. Servlet receives response and displays to user
   Response Format:
   {
     "status": "SUCCESS",
     "categoryCode": "ABC123",
     "categoryName": "Sample Category",
     "categoryKey": "12345",
     "siteCode": "00001"
   }
```

### 1.4 Key Characteristics of ESR

| Aspect | Details |
|--------|--------|
| **Data Volume** | Millions of records accumulated over years |
| **Approval Flow** | None - Direct execution |
| **Transaction Type** | Synchronous request-response |
| **Message Format** | Custom binary/text format |
| **Timeout** | 30 seconds per request |
| **Concurrency** | Low (10-20 concurrent users) |
| **Availability** | 99.5% (mainframe SLA) |
| **Data Ownership** | Mainframe team |

### 1.5 Why Mainframe Cannot Be Replaced

1. **Data Complexity:** Years of accumulated data with complex relationships
2. **Business Logic:** Critical business rules embedded in mainframe COBOL programs
3. **Dependencies:** Multiple downstream systems depend on ESR mainframe data
4. **Risk:** High risk of data loss or corruption during migration
5. **Cost:** Prohibitive cost to migrate and validate all historical data
6. **Timeline:** Would require 2-3 years for complete migration
7. **Regulatory:** Audit trail and historical data must be preserved

### 1.6 RDHM Architecture (Target)

```
┌─────────────────────────────────────────────────────────────────┐
│              RDHM Angular Frontend (Modern SPA)                  │
│  - Entity Management                                             │
│  - Hierarchy Management                                          │
│  - Approval Workflow UI                                          │
│  - Audit Trail                                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│              RDHM Java Backend (Spring Boot)                     │
│  - REST API Layer                                                │
│  - Business Logic Layer                                          │
│  - Approval Workflow Engine                                      │
│  - Audit Service                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓ JDBC
┌─────────────────────────────────────────────────────────────────┐
│              RDHM Database (PostgreSQL/Oracle)                   │
│  - Entity Tables                                                 │
│  - Workflow Tables                                               │
│  - Audit Tables                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key RDHM Features:**
- **Approval Workflow:** Multi-level approval (L1, L2, L3)
- **Audit Trail:** Complete change history
- **Role-Based Access:** Fine-grained permissions
- **Modern UI:** Angular-based responsive design
- **RESTful APIs:** Standard HTTP/JSON communication

---

## 2. Proposed Solution: MQ Adapter Layer Architecture

### 2.1 Solution Overview

**Objective:** Integrate ESR functionality into RDHM by creating an intermediate adapter layer that:
1. Connects RDHM's Java backend to ESR's MQ mainframe infrastructure
2. Adds approval workflow capabilities (which ESR currently lacks)
3. Provides modern Angular UI while preserving mainframe data and logic
4. Maintains audit trail and compliance requirements

#### 2.1.2 Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                    RDHM Angular Frontend                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ESR Module (Angular)                                 │  │
│  │  - Category Data Component                            │  │
│  │  - Category Structure Component                       │  │
│  │  - Grouping Data Component                            │  │
│  │  - Grouping Structure Component                       │  │
│  │  - Default Site Code Component                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│              RDHM Java Backend (Adapter Layer)              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ESR Adapter Service                                  │  │
│  │  - Request Transformation                             │  │
│  │  - Response Mapping                                   │  │
│  │  - Approval Workflow Integration                      │  │
│  │  - Audit Logging                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ MQ Protocol
┌─────────────────────────────────────────────────────────────┐
│              MQ Configuration (Mainframe)                    │
│  - Queue Managers (MBG1, MBG2, MBG3)                        │
│  - ESR Queue Handlers                                        │
│  - Mainframe Business Logic                                 │
└─────────────────────────────────────────────────────────────┘
```

#### 2.1.3 API Analysis

##### **APIs to Create (New)**

| API Endpoint | Method | Purpose | Complexity |
|--------------|--------|---------|------------|
| `/api/esr/category/search` | POST | Search category data | Medium |
| `/api/esr/category/create` | POST | Create new category | High |
| `/api/esr/category/update` | PUT | Update category | High |
| `/api/esr/category/delete` | DELETE | Delete category | High |
| `/api/esr/category-structure/search` | POST | Search category structure | Medium |
| `/api/esr/category-structure/hierarchy` | GET | Get category hierarchy | Medium |
| `/api/esr/grouping/search` | POST | Search grouping data | Medium |
| `/api/esr/grouping/create` | POST | Create grouping | High |
| `/api/esr/grouping/update` | PUT | Update grouping | High |
| `/api/esr/grouping/junior` | GET | Get junior grouping data | Medium |
| `/api/esr/grouping/senior` | GET | Get senior grouping data | Medium |
| `/api/esr/grouping-structure/search` | POST | Search grouping structure | Medium |
| `/api/esr/site-code/default` | GET | Get default site code | Low |
| `/api/esr/site-code/list` | GET | List all site codes | Low |
| `/api/esr/approval/submit` | POST | Submit for approval | High |
| `/api/esr/approval/status` | GET | Check approval status | Medium |

**Total New APIs:** 16

##### **MQ Integration Layer Components**

```java
// ESR MQ Adapter Service
@Service
public class EsrMqAdapterService {
    
    @Autowired
    private MQConnectionFactory mqConnectionFactory;
    
    @Autowired
    private ApprovalWorkflowService approvalService;
    
    public CategoryResponse searchCategory(CategorySearchRequest request) {
        // 1. Validate request
        // 2. Check if approval required
        // 3. Transform to MQ message format
        // 4. Send to MQ queue
        // 5. Receive response
        // 6. Transform response to REST format
        // 7. Apply RDHM business rules
    }
}
```

##### **Configuration Requirements**

```yaml
# application.yml
esr:
  mq:
    queue-manager: MBG1
    host: mainframe.hsbc.com
    port: 1414
    channel: ESR.CHANNEL
    queues:
      request: QA.ESR.CUPUT07.QB.ESR.DBMGR.RQST
      response: QA.ESR.CUPUT07.QB.ESR.DBMGR.RSPD
    timeout: 30000
    retry:
      max-attempts: 3
      backoff: 2000
```

#### 2.1.4 UI Screens Analysis

##### **Screens to Create/Migrate**

| Screen Name | Status | Components | Complexity | Effort (Days) |
|-------------|--------|------------|------------|---------------|
| ESR Main View | ✅ Exists | Tab navigation | Low | 0 |
| Category Data | ✅ Exists | Form, validation | Medium | 0 |
| Category Structure | ✅ Exists | Form, search | Medium | 0 |
| Grouping Data | ✅ Exists | Form, junior/senior | Medium | 0 |
| Grouping Structure | ✅ Exists | Form, search | Medium | 0 |
| Default Site Code | ⚠️ Partial | Display/Edit | Low | 2 |
| Category Detail View | ❌ Missing | Grid, CRUD | High | 5 |
| Grouping Detail View | ❌ Missing | Grid, CRUD | High | 5 |
| Approval Workflow UI | ❌ Missing | Workflow steps | High | 8 |
| Audit History View | ❌ Missing | Grid, filters | Medium | 3 |

**Total UI Screens:** 10  
**Existing:** 5  
**To Create:** 5  
**Estimated Effort:** 23 days

##### **UI Enhancements Needed**

1. **Approval Workflow Integration**
   - Submit for approval button
   - Approval status indicator
   - Approval history panel
   - Rejection reason display

2. **Validation Enhancement**
   - Real-time field validation
   - Business rule validation
   - Duplicate check
   - Cross-field validation

3. **User Experience**
   - Loading indicators
   - Error handling
   - Success notifications
   - Confirmation dialogs

4. **Data Grid Components**
   - Search results grid
   - Pagination
   - Sorting
   - Filtering
   - Export functionality

#### 2.1.5 Advantages

- ✅ Faster implementation (3-4 months)
- ✅ Minimal disruption to existing ESR backend
- ✅ Reuse existing mainframe business logic
- ✅ Lower risk of data migration issues
- ✅ Gradual transition possible

#### 2.1.6 Disadvantages

- ❌ Continued dependency on mainframe
- ❌ MQ infrastructure maintenance required
- ❌ Limited scalability
- ❌ Dual technology stack complexity
- ❌ Higher operational costs long-term

#### 2.1.7 Effort Estimation

| Component | Effort (Days) | Resources |
|-----------|---------------|-----------|
| MQ Adapter Layer | 20 | 2 Backend Devs |
| REST API Development | 30 | 2 Backend Devs |
| UI Components (New) | 23 | 2 Frontend Devs |
| Approval Workflow Integration | 15 | 1 Backend Dev |
| Testing & QA | 25 | 2 QA Engineers |
| Documentation | 10 | 1 Tech Writer |
| **Total** | **123 days** | **10 person-months** |

---

### Approach 2: Full MDM Integration (Recommended)

#### 2.2.1 Overview
Integrate ESR data model into RDHM's Master Data Management (MDM) framework, creating a unified data hierarchy system.

#### 2.2.2 Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│              RDHM Angular Frontend (Enhanced)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Unified MDM Module                                   │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Existing MDM Screens (Enhanced)               │  │  │
│  │  │  - Hierarchy Management                        │  │  │
│  │  │  - Entity Management                           │  │  │
│  │  │  - Relationship Management                     │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  ESR-Specific Extensions                       │  │  │
│  │  │  - Category Management                         │  │  │
│  │  │  - Grouping Management                         │  │  │
│  │  │  - Site Code Management                        │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│              RDHM Java Backend (Unified)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MDM Core Services                                    │  │
│  │  - Entity Service                                     │  │
│  │  - Hierarchy Service                                  │  │
│  │  - Relationship Service                               │  │
│  │  - Validation Service                                 │  │
│  │  - Approval Workflow Service                          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ESR Domain Services                                  │  │
│  │  - Category Service                                   │  │
│  │  - Grouping Service                                   │  │
│  │  - Site Code Service                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Data Migration Service                               │  │
│  │  - ESR Data Extractor (MQ)                           │  │
│  │  - Data Transformer                                   │  │
│  │  - Data Loader                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ JDBC
┌─────────────────────────────────────────────────────────────┐
│              RDHM Database (PostgreSQL/Oracle)               │
│  - MDM Core Tables                                           │
│  - ESR Domain Tables                                         │
│  - Audit Tables                                              │
│  - Workflow Tables                                           │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2.3 Data Model Design

##### **Proposed Database Schema**

```sql
-- Core MDM Entity Table (Existing - Enhanced)
CREATE TABLE mdm_entity (
    entity_id BIGINT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,  -- 'CATEGORY', 'GROUPING', 'SITE_CODE'
    entity_code VARCHAR(100) NOT NULL,
    entity_name VARCHAR(255),
    business_name VARCHAR(255),
    site_code VARCHAR(10),
    effective_date DATE,
    end_date DATE,
    status VARCHAR(20),  -- 'ACTIVE', 'INACTIVE', 'PENDING_APPROVAL'
    version INT DEFAULT 1,
    created_by VARCHAR(100),
    created_date TIMESTAMP,
    modified_by VARCHAR(100),
    modified_date TIMESTAMP,
    UNIQUE(entity_type, entity_code, site_code, effective_date)
);

-- ESR Category Extension Table (New)
CREATE TABLE esr_category (
    category_id BIGINT PRIMARY KEY,
    entity_id BIGINT REFERENCES mdm_entity(entity_id),
    category_code VARCHAR(50) NOT NULL,
    category_business_name VARCHAR(255),
    category_site VARCHAR(10),
    category_key VARCHAR(100),
    as_at_date DATE,
    is_local BOOLEAN DEFAULT FALSE,
    parent_category_id BIGINT REFERENCES esr_category(category_id),
    CONSTRAINT fk_category_entity FOREIGN KEY (entity_id) 
        REFERENCES mdm_entity(entity_id) ON DELETE CASCADE
);

-- ESR Grouping Extension Table (New)
CREATE TABLE esr_grouping (
    grouping_id BIGINT PRIMARY KEY,
    entity_id BIGINT REFERENCES mdm_entity(entity_id),
    grouping_code VARCHAR(50) NOT NULL,
    grouping_site VARCHAR(10),
    category_id BIGINT REFERENCES esr_category(category_id),
    grouping_type VARCHAR(20),  -- 'JUNIOR', 'SENIOR'
    as_at_date DATE,
    CONSTRAINT fk_grouping_entity FOREIGN KEY (entity_id) 
        REFERENCES mdm_entity(entity_id) ON DELETE CASCADE
);

-- Category-Grouping Relationship (New)
CREATE TABLE esr_category_grouping (
    relationship_id BIGINT PRIMARY KEY,
    category_id BIGINT REFERENCES esr_category(category_id),
    grouping_id BIGINT REFERENCES esr_grouping(grouping_id),
    relationship_type VARCHAR(50),  -- 'JUNIOR', 'SENIOR', 'PEER'
    effective_date DATE,
    end_date DATE,
    created_by VARCHAR(100),
    created_date TIMESTAMP
);

-- Site Code Master (New)
CREATE TABLE esr_site_code (
    site_code_id BIGINT PRIMARY KEY,
    site_code VARCHAR(10) UNIQUE NOT NULL,
    site_name VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    country_code VARCHAR(3),
    region VARCHAR(50),
    status VARCHAR(20),
    created_by VARCHAR(100),
    created_date TIMESTAMP
);

-- Approval Workflow (Existing - Reused)
CREATE TABLE mdm_approval_workflow (
    workflow_id BIGINT PRIMARY KEY,
    entity_id BIGINT REFERENCES mdm_entity(entity_id),
    workflow_type VARCHAR(50),  -- 'CREATE', 'UPDATE', 'DELETE'
    status VARCHAR(20),  -- 'PENDING', 'APPROVED', 'REJECTED'
    submitted_by VARCHAR(100),
    submitted_date TIMESTAMP,
    approved_by VARCHAR(100),
    approved_date TIMESTAMP,
    rejection_reason TEXT,
    approval_level INT
);

-- Audit Trail (Existing - Reused)
CREATE TABLE mdm_audit_log (
    audit_id BIGINT PRIMARY KEY,
    entity_id BIGINT,
    entity_type VARCHAR(50),
    action VARCHAR(20),  -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(100),
    changed_date TIMESTAMP,
    ip_address VARCHAR(45)
);
```

##### **Data Model Mapping**

| ESR Concept | RDHM MDM Mapping | Notes |
|-------------|------------------|-------|
| Category | MDM Entity (Type: CATEGORY) | Extends base entity |
| Grouping | MDM Entity (Type: GROUPING) | Extends base entity |
| Site Code | MDM Entity (Type: SITE_CODE) | New entity type |
| Category Structure | Hierarchy Relationship | Self-referencing |
| Grouping Structure | Hierarchy Relationship | Category-Grouping link |
| As-at Date | Effective Date | Temporal versioning |
| Local vs Enterprise | Site Code attribute | Scope indicator |

#### 2.2.4 API Analysis

##### **Existing APIs to Reuse (As-Is)**

| API Endpoint | Purpose | Reusability |
|--------------|---------|-------------|
| `/api/mdm/entity/create` | Create entity | ✅ 100% |
| `/api/mdm/entity/update` | Update entity | ✅ 100% |
| `/api/mdm/entity/delete` | Delete entity | ✅ 100% |
| `/api/mdm/entity/search` | Search entities | ✅ 90% (minor enhancement) |
| `/api/mdm/hierarchy/get` | Get hierarchy | ✅ 100% |
| `/api/mdm/hierarchy/create` | Create relationship | ✅ 100% |
| `/api/mdm/approval/submit` | Submit for approval | ✅ 100% |
| `/api/mdm/approval/approve` | Approve request | ✅ 100% |
| `/api/mdm/approval/reject` | Reject request | ✅ 100% |
| `/api/mdm/audit/history` | Get audit trail | ✅ 100% |

**Total Reusable APIs:** 10 (Estimated 80% of required functionality)

##### **New APIs to Create**

| API Endpoint | Method | Purpose | Complexity |
|--------------|--------|---------|------------|
| `/api/mdm/category/search-advanced` | POST | Advanced category search with ESR-specific filters | Medium |
| `/api/mdm/category/structure` | GET | Get category structure hierarchy | Medium |
| `/api/mdm/grouping/junior` | GET | Get junior grouping relationships | Low |
| `/api/mdm/grouping/senior` | GET | Get senior grouping relationships | Low |
| `/api/mdm/site-code/default` | GET | Get default site code | Low |
| `/api/mdm/site-code/set-default` | PUT | Set default site code | Low |
| `/api/mdm/migration/esr-import` | POST | Import ESR data from MQ | High |
| `/api/mdm/migration/status` | GET | Check migration status | Low |

**Total New APIs:** 8

##### **API Enhancement Requirements**

```java
// Enhanced Entity Service
@Service
public class MdmEntityService {
    
    // Existing method - no changes
    public EntityResponse createEntity(EntityRequest request) {
        // Existing implementation
    }
    
    // New method - ESR-specific
    public CategoryResponse createCategory(CategoryRequest request) {
        // 1. Create base MDM entity
        EntityRequest entityRequest = mapToEntity(request);
        EntityResponse entity = createEntity(entityRequest);
        
        // 2. Create ESR category extension
        EsrCategory category = new EsrCategory();
        category.setEntityId(entity.getEntityId());
        category.setCategoryCode(request.getCategoryCode());
        category.setCategoryBusinessName(request.getBusinessName());
        // ... set other fields
        
        // 3. Save category extension
        esrCategoryRepository.save(category);
        
        // 4. Create hierarchy if parent exists
        if (request.getParentCategoryId() != null) {
            createHierarchyRelationship(category.getCategoryId(), 
                                       request.getParentCategoryId());
        }
        
        return mapToCategoryResponse(entity, category);
    }
}
```

#### 2.2.5 UI Enhancements on Current MDM Screens

##### **Screen Enhancement Matrix**

| MDM Screen | Current State | ESR Enhancement | Effort (Days) |
|------------|---------------|-----------------|---------------|
| **Entity Management** | Generic entity CRUD | Add Category/Grouping specific fields | 5 |
| **Hierarchy View** | Tree view | Add Category Structure visualization | 8 |
| **Search Screen** | Basic search | Add ESR-specific filters (site code, as-at date) | 3 |
| **Detail View** | Generic fields | Add Category/Grouping detail panels | 5 |
| **Approval Dashboard** | Generic workflow | Add ESR-specific approval rules | 3 |
| **Bulk Operations** | Basic bulk edit | Add bulk category/grouping operations | 5 |
| **Reports** | Standard reports | Add ESR-specific reports | 8 |

**Total Enhancement Effort:** 37 days

##### **New UI Components Required**

1. **Category Management Panel**
   - Category code input with validation
   - Business name field
   - Site code selector
   - As-at date picker
   - Local/Enterprise toggle
   - Parent category selector

2. **Grouping Management Panel**
   - Grouping code input
   - Category association
   - Junior/Senior type selector
   - Site code selector
   - Relationship grid

3. **Site Code Management**
   - Site code list
   - Default site code indicator
   - Set default action
   - Site code details

4. **Category Structure Visualizer**
   - Hierarchical tree view
   - Drag-and-drop reordering
   - Expand/collapse nodes
   - Search within hierarchy

5. **Advanced Search Panel**
   - Multi-criteria search
   - Date range filters
   - Site code filters
   - Status filters
   - Export results

##### **UI Component Reusability**

| Component | Reusability | Notes |
|-----------|-------------|-------|
| Form Controls | 100% | Use existing form components |
| Data Grids | 100% | Use existing grid component |
| Tree View | 80% | Minor enhancements needed |
| Date Picker | 100% | Use existing date picker |
| Dropdown | 100% | Use existing dropdown |
| Validation | 90% | Add ESR-specific validators |
| Modal Dialogs | 100% | Use existing modal service |
| Notifications | 100% | Use existing notification service |

#### 2.2.6 Data Migration Strategy

##### **Phase 1: Data Extraction**

```java
@Service
public class EsrDataMigrationService {
    
    @Autowired
    private MQConnectionFactory mqConnectionFactory;
    
    public List<CategoryData> extractCategoriesFromMQ() {
        // 1. Connect to MQ
        // 2. Send extraction request
        // 3. Receive category data
        // 4. Parse MQ message format
        // 5. Transform to domain objects
        // 6. Validate data integrity
        return categoryList;
    }
    
    public List<GroupingData> extractGroupingsFromMQ() {
        // Similar to category extraction
    }
}
```

##### **Phase 2: Data Transformation**

```java
@Service
public class EsrDataTransformer {
    
    public MdmEntity transformCategory(CategoryData esrCategory) {
        MdmEntity entity = new MdmEntity();
        entity.setEntityType("CATEGORY");
        entity.setEntityCode(esrCategory.getCategoryCode());
        entity.setEntityName(esrCategory.getBusinessName());
        entity.setSiteCode(esrCategory.getSiteCode());
        entity.setEffectiveDate(esrCategory.getAsAtDate());
        entity.setStatus("ACTIVE");
        
        // Create extension
        EsrCategory categoryExt = new EsrCategory();
        categoryExt.setCategoryCode(esrCategory.getCategoryCode());
        categoryExt.setCategoryBusinessName(esrCategory.getBusinessName());
        // ... map other fields
        
        return entity;
    }
}
```

##### **Phase 3: Data Loading**

```java
@Service
public class EsrDataLoader {
    
    @Transactional
    public MigrationResult loadCategories(List<MdmEntity> entities) {
        MigrationResult result = new MigrationResult();
        
        for (MdmEntity entity : entities) {
            try {
                // 1. Check for duplicates
                // 2. Validate business rules
                // 3. Insert into database
                // 4. Create audit entry
                mdmEntityRepository.save(entity);
                result.incrementSuccess();
            } catch (Exception e) {
                result.addError(entity.getEntityCode(), e.getMessage());
            }
        }
        
        return result;
    }
}
```

##### **Migration Execution Plan**

| Phase | Activity | Duration | Dependencies |
|-------|----------|----------|--------------|
| 1 | Data Analysis | 5 days | ESR MQ access |
| 2 | Schema Creation | 3 days | DBA approval |
| 3 | Migration Tool Development | 10 days | Schema ready |
| 4 | Data Extraction | 2 days | MQ connectivity |
| 5 | Data Validation | 3 days | Extracted data |
| 6 | Test Migration | 5 days | Validation complete |
| 7 | Production Migration | 2 days | Test success |
| 8 | Verification | 3 days | Migration complete |
| **Total** | **33 days** | | |

#### 2.2.7 Advantages

- ✅ Unified data model (single source of truth)
- ✅ Eliminates mainframe dependency
- ✅ Better scalability and performance
- ✅ Leverages existing RDHM approval workflow
- ✅ Consistent user experience
- ✅ Lower long-term operational costs
- ✅ Modern technology stack
- ✅ Better reporting and analytics capabilities

#### 2.2.8 Disadvantages

- ❌ Longer implementation time (6-8 months)
- ❌ Complex data migration required
- ❌ Higher initial development cost
- ❌ Risk of data migration issues
- ❌ Requires extensive testing
- ❌ Business process changes needed

#### 2.2.9 Effort Estimation

| Component | Effort (Days) | Resources |
|-----------|---------------|-----------|
| Database Schema Design | 10 | 1 DB Architect |
| Data Model Implementation | 15 | 2 Backend Devs |
| Domain Services Development | 40 | 3 Backend Devs |
| REST API Development | 25 | 2 Backend Devs |
| UI Component Enhancement | 37 | 3 Frontend Devs |
| Data Migration Tool | 20 | 2 Backend Devs |
| Data Migration Execution | 33 | 2 Data Engineers |
| Integration Testing | 30 | 3 QA Engineers |
| UAT Support | 15 | 2 QA Engineers |
| Documentation | 15 | 1 Tech Writer |
| **Total** | **240 days** | **20 person-months** |

---

## 3. Comparative Analysis

### 3.1 Feature Comparison

| Feature | Approach 1 (UI Only) | Approach 2 (Full MDM) |
|---------|---------------------|----------------------|
| **Implementation Time** | 3-4 months | 6-8 months |
| **Development Cost** | $150K - $200K | $300K - $400K |
| **Mainframe Dependency** | Yes | No |
| **Data Consistency** | Medium | High |
| **Scalability** | Low | High |
| **Maintenance Cost** | High | Low |
| **User Experience** | Good | Excellent |
| **Approval Workflow** | Requires custom integration | Native support |
| **Reporting** | Limited | Comprehensive |
| **Future Extensibility** | Low | High |

### 3.2 Risk Analysis

#### Approach 1 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| MQ connectivity issues | Medium | High | Implement retry mechanism, circuit breaker |
| Mainframe performance | Medium | Medium | Implement caching, async processing |
| Technology debt | High | High | Plan for future migration to Approach 2 |
| Operational complexity | High | Medium | Comprehensive monitoring and alerting |
| Vendor lock-in | High | High | Document all MQ dependencies |

#### Approach 2 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data migration failure | Medium | High | Extensive testing, rollback plan |
| Extended timeline | Medium | Medium | Phased implementation, agile approach |
| Business process changes | Medium | High | Change management, training |
| Integration complexity | Low | Medium | Thorough design, POC |
| Resource availability | Medium | Medium | Early resource allocation |

### 3.3 Cost-Benefit Analysis (5-Year TCO)

| Cost Component | Approach 1 | Approach 2 |
|----------------|-----------|-----------|
| **Initial Development** | $175K | $350K |
| **Infrastructure (Annual)** | $50K | $20K |
| **Maintenance (Annual)** | $80K | $40K |
| **Support (Annual)** | $40K | $25K |
| **5-Year Total** | $1,025K | $775K |
| **ROI** | Lower | Higher |

---

## 4. Recommended Approach

### 4.1 Recommendation: **Approach 2 (Full MDM Integration)**

#### Rationale:
1. **Strategic Alignment:** Aligns with RDHM's vision of unified master data management
2. **Long-term Value:** Lower TCO and better ROI over 5 years
3. **Technology Modernization:** Eliminates legacy mainframe dependency
4. **Scalability:** Better positioned for future growth
5. **User Experience:** Consistent, modern UI across all MDM functions
6. **Operational Excellence:** Simplified operations and maintenance

### 4.2 Implementation Roadmap

#### **Phase 1: Foundation (Months 1-2)**
- Database schema design and approval
- Core domain services development
- API design and documentation
- Development environment setup

**Deliverables:**
- Database schema scripts
- API specification document
- Development environment
- Technical design document

#### **Phase 2: Core Development (Months 3-4)**
- Domain services implementation
- REST API development
- UI component enhancement
- Unit testing

**Deliverables:**
- Backend services (80% complete)
- REST APIs (100% complete)
- Enhanced UI components (60% complete)
- Unit test coverage (80%)

#### **Phase 3: Data Migration (Month 5)**
- Migration tool development
- Data extraction from MQ
- Data transformation and validation
- Test migration execution

**Deliverables:**
- Migration tool
- Migrated test data
- Data validation report
- Migration runbook

#### **Phase 4: Integration & Testing (Month 6)**
- System integration testing
- Performance testing
- Security testing
- UAT preparation

**Deliverables:**
- Test reports
- Performance benchmarks
- Security audit report
- UAT test cases

#### **Phase 5: UAT & Training (Month 7)**
- User acceptance testing
- User training
- Documentation
- Bug fixes

**Deliverables:**
- UAT sign-off
- Training materials
- User documentation
- Release notes

#### **Phase 6: Production Deployment (Month 8)**
- Production data migration
- Production deployment
- Hypercare support
- Post-deployment validation

**Deliverables:**
- Production system
- Deployment report
- Support documentation
- Lessons learned

### 4.3 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data Migration Accuracy | 99.9% | Automated validation |
| System Performance | < 2s response time | Load testing |
| User Adoption | > 90% | Usage analytics |
| Defect Rate | < 5 critical bugs | Bug tracking |
| Approval Workflow | 100% functional | Integration testing |
| User Satisfaction | > 4.0/5.0 | Survey |

---

## 5. Technical Architecture Details

### 5.1 System Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Angular Frontend (Port 4200)                         │  │
│  │  - ESR Module                                         │  │
│  │  - MDM Module                                         │  │
│  │  - Shared Components                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS/REST
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Spring Cloud Gateway (Port 8080)                     │  │
│  │  - Authentication (OAuth2/JWT)                        │  │
│  │  - Rate Limiting                                      │  │
│  │  - Request Routing                                    │  │
│  │  - Circuit Breaker                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MDM Service (Port 8081)                              │  │
│  │  - Entity Management                                  │  │
│  │  - Hierarchy Management                               │  │
│  │  - Validation Service                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ESR Domain Service (Port 8082)                       │  │
│  │  - Category Service                                   │  │
│  │  - Grouping Service                                   │  │
│  │  - Site Code Service                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Workflow Service (Port 8083)                         │  │
│  │  - Approval Engine                                    │  │
│  │  - Notification Service                               │  │
│  │  - Audit Service                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL/Oracle Database                           │  │
│  │  - MDM Schema                                         │  │
│  │  - ESR Schema                                         │  │
│  │  - Audit Schema                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Redis Cache                                          │  │
│  │  - Session Cache                                      │  │
│  │  - Data Cache                                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Security Architecture

```yaml
security:
  authentication:
    type: OAuth2
    provider: HSBC SSO
    token-type: JWT
    token-expiry: 3600
    
  authorization:
    type: RBAC
    roles:
      - ESR_ADMIN
      - ESR_USER
      - ESR_APPROVER
      - MDM_ADMIN
      
  data-encryption:
    at-rest: AES-256
    in-transit: TLS 1.3
    
  audit:
    enabled: true
    log-level: INFO
    retention-days: 2555
```

### 5.3 Performance Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Page Load Time | < 2 seconds | 95th percentile |
| API Response Time | < 500ms | Average |
| Concurrent Users | 500+ | Peak load |
| Database Query Time | < 100ms | Average |
| Throughput | 1000 TPS | Transactions per second |
| Availability | 99.9% | Uptime SLA |

---

## 6. Approval Workflow Integration

### 6.1 Workflow Design

```
┌─────────────────────────────────────────────────────────────┐
│                    ESR Data Change Request                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Validation                                          │
│  - Business rule validation                                  │
│  - Data integrity check                                      │
│  - Duplicate check                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: L1 Approval (Team Lead)                            │
│  - Review change details                                     │
│  - Verify business justification                             │
│  - Approve/Reject/Return                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: L2 Approval (Manager) - If High Impact             │
│  - Review change impact                                      │
│  - Verify compliance                                         │
│  - Approve/Reject/Return                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Execution                                           │
│  - Apply changes to database                                 │
│  - Create audit trail                                        │
│  - Send notifications                                        │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Approval Rules

| Change Type | Approval Level | Approver Role | SLA |
|-------------|----------------|---------------|-----|
| Create Category | L1 | Team Lead | 24 hours |
| Update Category | L1 | Team Lead | 24 hours |
| Delete Category | L2 | Manager | 48 hours |
| Create Grouping | L1 | Team Lead | 24 hours |
| Update Grouping | L1 | Team Lead | 24 hours |
| Delete Grouping | L2 | Manager | 48 hours |
| Bulk Changes | L2 | Manager | 48 hours |
| Site Code Change | L2 | Manager | 48 hours |

---

## 7. Testing Strategy

### 7.1 Test Levels

| Test Level | Coverage | Tools | Duration |
|------------|----------|-------|----------|
| Unit Testing | 80%+ | JUnit, Jest | Ongoing |
| Integration Testing | 100% APIs | Postman, RestAssured | 2 weeks |
| System Testing | End-to-end flows | Selenium, Cypress | 2 weeks |
| Performance Testing | Load & stress | JMeter, Gatling | 1 week |
| Security Testing | OWASP Top 10 | OWASP ZAP, Burp | 1 week |
| UAT | Business scenarios | Manual | 2 weeks |

### 7.2 Test Scenarios

#### **Category Management**
- Create new category with valid data
- Create category with duplicate code (negative)
- Update category business name
- Delete category with dependencies (negative)
- Search categories by code
- Search categories by business name
- Filter categories by site code
- View category hierarchy

#### **Grouping Management**
- Create new grouping
- Associate grouping with category
- View junior grouping relationships
- View senior grouping relationships
- Update grouping details
- Delete grouping

#### **Approval Workflow**
- Submit category for approval
- Approve category creation
- Reject category creation
- Return for modification
- View approval history
- Bulk approval

#### **Data Migration**
- Extract data from MQ
- Transform ESR data to MDM format
- Load data into database
- Validate migrated data
- Handle migration errors
- Rollback migration

---

## 8. Deployment Strategy

### 8.1 Deployment Approach: Blue-Green Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                             │
└─────────────────────────────────────────────────────────────┘
                    ↓                    ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│   Blue Environment       │  │   Green Environment      │
│   (Current Production)   │  │   (New Version)          │
│                          │  │                          │
│   - RDHM v1.x           │  │   - RDHM v2.0 + ESR     │
│   - No ESR              │  │   - Full MDM Integration │
└──────────────────────────┘  └──────────────────────────┘
```

### 8.2 Deployment Steps

1. **Pre-Deployment (Week 1)**
   - Code freeze
   - Final testing
   - Deployment runbook review
   - Rollback plan preparation

2. **Deployment (Weekend)**
   - Deploy to green environment
   - Smoke testing
   - Data migration execution
   - Switch traffic to green
   - Monitor for issues

3. **Post-Deployment (Week 1)**
   - Hypercare support
   - Performance monitoring
   - User feedback collection
   - Issue resolution

4. **Stabilization (Week 2-4)**
   - Continued monitoring
   - Performance tuning
   - Decommission blue environment

---

## 9. Training & Change Management

### 9.1 Training Plan

| Audience | Training Type | Duration | Content |
|----------|---------------|----------|---------|
| End Users | Hands-on workshop | 4 hours | UI navigation, basic operations |
| Power Users | Advanced workshop | 8 hours | Advanced features, reporting |
| Approvers | Role-based training | 2 hours | Approval workflow |
| Administrators | Technical training | 16 hours | System administration |
| Support Team | Technical training | 16 hours | Troubleshooting, support |

### 9.2 Change Management Activities

- **Communication Plan:** Regular updates via email, town halls
- **User Documentation:** User guides, FAQs, video tutorials
- **Support Model:** Helpdesk, chat support, email support
- **Feedback Mechanism:** Surveys, feedback forms, user groups

---

## 10. Monitoring & Operations

### 10.1 Monitoring Strategy

```yaml
monitoring:
  application:
    - Response time metrics
    - Error rate tracking
    - API call volumes
    - User session analytics
    
  infrastructure:
    - CPU utilization
    - Memory usage
    - Disk I/O
    - Network throughput
    
  business:
    - Daily active users
    - Approval turnaround time
    - Data quality metrics
    - User satisfaction scores
    
  tools:
    - Application: New Relic, Dynatrace
    - Infrastructure: Prometheus, Grafana
    - Logging: ELK Stack (Elasticsearch, Logstash, Kibana)
    - Alerting: PagerDuty, Slack
```

### 10.2 Operational Runbooks

| Scenario | Runbook | Owner |
|----------|---------|-------|
| Application Down | APP-001 | DevOps Team |
| Database Connection Issues | DB-001 | DBA Team |
| Performance Degradation | PERF-001 | DevOps Team |
| Data Inconsistency | DATA-001 | Support Team |
| Approval Workflow Stuck | WF-001 | Support Team |

---

## 11. Risks & Mitigation

### 11.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data migration data loss | Critical | Low | Multiple backups, validation scripts |
| Performance issues | High | Medium | Load testing, performance tuning |
| Integration failures | High | Low | Comprehensive integration testing |
| Security vulnerabilities | Critical | Low | Security testing, code review |
| Scalability limitations | Medium | Low | Architecture review, load testing |

### 11.2 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User resistance | Medium | Medium | Change management, training |
| Extended timeline | High | Medium | Agile approach, phased delivery |
| Budget overrun | High | Low | Regular cost tracking, contingency |
| Scope creep | Medium | High | Strict change control process |
| Business disruption | Critical | Low | Phased rollout, rollback plan |

---

## 12. Assumptions & Dependencies

### 12.1 Assumptions

- RDHM infrastructure can support additional load
- Database capacity is sufficient for ESR data
- MQ connectivity available during migration
- Users available for UAT
- Approval workflow can be extended for ESR
- No major changes to ESR data model during migration

### 12.2 Dependencies

| Dependency | Owner | Status | Risk |
|------------|-------|--------|------|
| Database schema approval | DBA Team | Pending | Medium |
| MQ access for data extraction | Infrastructure Team | Pending | High |
| UAT environment availability | DevOps Team | Available | Low |
| User availability for testing | Business Team | Pending | Medium |
| Security approval | Security Team | Pending | Medium |
| Budget approval | Finance Team | Pending | High |

---

## 13. Success Metrics & KPIs

### 13.1 Project Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| On-time Delivery | 100% | Project timeline |
| Budget Adherence | ±10% | Financial tracking |
| Scope Completion | 100% | Requirements traceability |
| Defect Density | < 5 per KLOC | Code quality tools |
| Test Coverage | > 80% | Code coverage tools |

### 13.2 Post-Implementation KPIs

| KPI | Target | Frequency |
|-----|--------|-----------|
| System Availability | 99.9% | Daily |
| Average Response Time | < 2s | Daily |
| User Satisfaction | > 4.0/5.0 | Monthly |
| Approval Turnaround Time | < 24h | Weekly |
| Data Quality Score | > 95% | Weekly |
| Support Ticket Volume | < 50/month | Monthly |

---

## 14. Conclusion

The migration of ESR into RDHM represents a significant modernization initiative that will eliminate legacy mainframe dependencies and create a unified master data management platform. 

**Key Recommendations:**

1. **Adopt Approach 2 (Full MDM Integration)** for long-term strategic value
2. **Implement in phases** over 8 months to manage risk
3. **Invest in comprehensive testing** to ensure data integrity
4. **Focus on change management** to drive user adoption
5. **Establish robust monitoring** for operational excellence

**Expected Benefits:**

- **Cost Savings:** $250K over 5 years (TCO reduction)
- **Efficiency Gains:** 40% reduction in approval turnaround time
- **User Experience:** Unified, modern interface
- **Scalability:** Support for 3x current data volume
- **Maintainability:** 50% reduction in maintenance effort

**Next Steps:**

1. Secure executive approval and budget
2. Assemble project team
3. Initiate Phase 1 (Foundation)
4. Begin stakeholder engagement
5. Kick off detailed design

---

## 15. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| ESR | Enterprise Structures & Reference |
| RDHM | Reference Data Hierarchy Management |
| MDM | Master Data Management |
| MQ | Message Queue (IBM MQ) |
| CRUD | Create, Read, Update, Delete |
| SLA | Service Level Agreement |
| TCO | Total Cost of Ownership |
| ROI | Return on Investment |
| UAT | User Acceptance Testing |

### Appendix B: References

- RDHM Technical Architecture Document v2.1
- ESR System Documentation
- HSBC Security Standards
- HSBC Development Guidelines
- IBM MQ Documentation

### Appendix C: Contact Information

| Role | Name | Email |
|------|------|-------|
| Project Sponsor | [TBD] | [TBD] |
| Technical Lead | [TBD] | [TBD] |
| Product Owner | [TBD] | [TBD] |
| Architecture Lead | [TBD] | [TBD] |

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-10 | Technical Team | Initial draft |

**Approval**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Product Owner | | | |
| Architecture Lead | | | |
| Project Sponsor | | | |

---

*End of Document*
