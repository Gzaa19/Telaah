# Technical Plan: [FEATURE] – ICONIX Process

**Branch**: `feat/[###-feature-name]` | **Date**: [DATE] | **Spec**: [link to spec.md]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`
**Methodology Reference**: Doug Rosenberg & Matt Stephens, *Use Case Driven Object Modeling with UML*

---

## 1. System Architecture & Technical Context
<!-- Overall technology stack, layer mapping, and communication boundaries -->
- **Frontend Layer**: Next.js App Router, React, Tailwind CSS / Vanilla CSS, React Query
- **Backend Layer**: FastAPI (Python 3.12), Pydantic v2, SQLModel / SQLAlchemy ORM
- **Persistence & Caching**: PostgreSQL (with pgvector), Redis
- **Architectural Pattern**: **Router (Boundary) → Service (Controller) → Repository/Model (Entity)**

---

## 2. Updated Domain Model
<!--
  Rosenberg Phase: Domain Model Evolution.
  Reflect entities and relationships refined during analysis.
-->

```mermaid
classDiagram
    class EntityName {
        +UUID id
        +String name
        +Enum status
        +DateTime created_at
        +DateTime updated_at
    }
```
- **Entities & Types**: [Detail domain models, fields, types, and constraints]
- **Associations & Multiplicities**: [1..1, 1..*, 0..1 foreign key relationships]
- **Database Schema Migrations**: [Required Alembic/SQL scripts and indexes]

---

## 3. ICONIX Robustness Analysis (Preliminary Design)
<!--
  Doug Rosenberg's Four Rules of Robustness Analysis:
  1. Actors can only talk to Boundary objects.
  2. Boundary objects can only talk to Controllers and Actors.
  3. Entity objects can only talk to Controllers.
  4. Controller objects can talk to Boundaries, Entities, and other Controllers (NEVER to Actors directly).
  THE GOLDEN RULE: A Boundary object may NEVER connect directly to an Entity object.
-->

### Robustness Diagram: UC-[ID] [Use Case Title]
<!--
  Rosenberg Canonical Robustness Rules:
  1. Actor interacts ONLY with Boundaries.
  2. Controllers MUST be named using Verb Phrases (business logic actions, not software classes).
  3. Boundaries interact ONLY with Controllers and Actors (never direct to Entities).
  4. Entities represent domain model persistent state (accessed only by Controllers).
  5. Layout follows the use case narrative flow (Sunny Day main path + Rainy Day branches).
-->

```mermaid
flowchart TD
    classDef actor fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#f8fafc
    classDef boundary fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#f0f9ff
    classDef controller fill:#451a03,stroke:#d97706,stroke-width:2px,color:#fef3c7
    classDef entity fill:#064e3b,stroke:#059669,stroke-width:2px,color:#ecfdf5

    ACTOR["Actor: [Actor Name]"]:::actor

    B1[/"Boundary: [Client UI Screen / Page Name]"/]:::boundary
    B2[/"Boundary: [Confirmation / Result Modal / View]"/]:::boundary

    C1(["Controller: [Verb: Validate Input Request]"]):::controller
    C2(["Controller: [Verb: Process Business Logic]"]):::controller
    C3(["Controller: [Verb: Evaluate Authorization / Business Rule]"]):::controller

    E1[("Entity: [Domain Model Entity 1]")]:::entity
    E2[("Entity: [Domain Model Entity 2]")]:::entity

    ACTOR -->|"1. [Actor Action]"| B1
    B1 -->|"2. [Dispatches Request]"| C1
    C1 -->|"3. [Processes Validated Data]"| C2
    C2 -->|"4. [Mutates / Reads State]"| E1
    C2 -->|"5. [Checks State / Rules]"| C3
    C3 -->|"6. [Mutates Associated State]"| E2
    C3 -->|"Sunny Day: Success"| B2
    C3 -->|"Rainy Day: Validation / Rule Failure"| B1
    B2 -->|"7. [Renders Output]"| ACTOR
```

<details>
<summary><b>Canonical PlantUML: Robustness Diagram (Native BCE Icons)</b></summary>

```plantuml
@startuml
left to right direction
skinparam handwritten false
skinparam monochrome false
skinparam shadowing false

actor "[Actor Name]" as ACTOR
boundary "[Client UI Screen / Page Name]" as B1
boundary "[Confirmation / Result Modal / View]" as B2

control "[Validate Input Request]" as C1
control "[Process Business Logic]" as C2
control "[Evaluate Business Rule]" as C3

entity "[Domain Model Entity 1]" as E1
entity "[Domain Model Entity 2]" as E2

ACTOR --> B1 : [Actor Action]
B1 --> C1 : [Dispatches Request]
C1 --> C2 : [Processes Validated Data]
C2 --> E1 : [Mutates / Reads State]
C2 --> C3 : [Checks Rules]
C3 --> E2 : [Mutates State]
C3 --> B2 : [Sunny Day: Success]
C3 --> B1 : [Rainy Day: Rule Failure]
B2 --> ACTOR : [Renders Output]
@enduml
```
</details>

### Boundary-Controller-Entity (BCE) Inventory & Method Allocation
<!-- Controllers represent verbs/behavior that get allocated to class methods during Detailed Design -->

| BCE Type | Element Name | Responsibility / Concrete Implementation Allocation |
|---|---|---|
| **Boundary** | `[Screen / Modal Name]` | Frontend Client UI Component / Page (`frontend/...`). |
| **Controller** | `[Verb: Action Name]` | Allocated to `[ServiceClass.method_name()]`. |
| **Entity** | `[Domain Entity Name]` | Persisted Domain Model Entity matching database schema (`backend/.../models.py`). |

### BCE Rule Compliance Audit (Doug Rosenberg Rules)
- [x] **Rule 1 (Actors talk only to Boundaries)**: Confirmed user interacts exclusively with Client UI boundary objects.
- [x] **Rule 2 (Boundaries talk only to Controllers and Actors)**: Confirmed UI boundaries dispatch logic directly to controllers.
- [x] **Rule 3 (Entities talk only to Controllers)**: Confirmed domain entity models are accessed and mutated exclusively via controllers.
- [x] **Rule 4 (Controllers talk to Boundaries, Controllers, Entities; not to Actors)**: Confirmed controllers do not touch actors directly.
- [x] **Zero Direct Boundary-to-Entity Links**: Confirmed NO direct links from Boundary to Entity exist.

---

## 4. Preliminary Design Review (PDR) Checkpoint Gate
<!--
  Rosenberg Gate: Must pass PDR before proceeding to Detailed Design (Sequence Diagrams).
-->

| PDR Criteria | Status | Evidence / Notes |
|---|:---:|---|
| **1. Use Case Coverage** | PASS / FAIL | Does the robustness diagram account for all sunny-day steps? |
| **2. Alternate Courses Handled** | PASS / FAIL | Are all rainy-day exception flows wired through controllers? |
| **3. Domain Model Updated** | PASS / FAIL | Were new entities discovered and added to Section 2? |
| **4. Strict BCE Adherence** | PASS / FAIL | Confirmed NO direct Boundary-to-Entity connections exist. |

*GATE STATUS*: **[APPROVED TO PROCEED TO DETAILED DESIGN]**

---

## 5. Detailed Design: Sequence Diagrams (Behavior Allocation)
<!--
  Rosenberg Phase: Detailed Design.
  Sequence diagrams allocate methods to classes discovered in robustness analysis.
  Participant count & types MUST match Robustness Diagram 1-to-1.
  Do NOT use technical HTTP CRUD (GET/POST/DELETE) or raw SQL queries; use OO method invocations.
-->

### Sequence Diagram: UC-[ID]
```mermaid
sequenceDiagram
    autonumber
    actor User as Actor: [Actor Name]
    participant GUI as Boundary: [Client UI Screen / Modal]
    participant Service as Controller: [DomainService]
    participant Entity1 as Entity: [DomainModelEntity1]
    participant Entity2 as Entity: [DomainModelEntity2]
    participant ResultGUI as Boundary: [Result / Output Screen]

    User->>GUI: apply_filter(criteria)
    GUI->>Service: filter_records(criteria)
    Service->>Entity1: query_matching(budget, categories)
    Entity1-->>Service: matching_records
    Service->>Entity2: load_associated_metadata(record_ids)
    Entity2-->>Service: metadata_records
    Service->>Service: rank_and_format(matching_records, metadata_records)
    Service->>ResultGUI: display_results(formatted_results)
    ResultGUI-->>User: render_results_view()
```

<details>
<summary><b>Canonical PlantUML: Sequence Diagram (Native BCE Lifeline Icons)</b></summary>

```plantuml
@startuml
autonumber
skinparam responseMessageBelowArrow true

actor "[Actor Name]" as User
boundary "[Client UI Screen / Modal]" as GUI
control "[DomainService]" as Service
entity "[DomainModelEntity1]" as Entity1
entity "[DomainModelEntity2]" as Entity2
boundary "[Result / Output Screen]" as ResultGUI

User -> GUI : apply_filter(criteria)
GUI -> Service : filter_records(criteria)
Service -> Entity1 : query_matching(budget, categories)
Entity1 --> Service : matching_records
Service -> Entity2 : load_associated_metadata(record_ids)
Entity2 --> Service : metadata_records
Service -> Service : rank_and_format(matching_records, metadata_records)
Service -> ResultGUI : display_results(formatted_results)
ResultGUI --> User : render_results_view()
@enduml
```
</details>

---

## 6. Detailed Design: Static Class Model
<!--
  Rosenberg Phase: Static Class Diagrams.
  Add methods discovered on sequence diagrams to class definitions with types and visibility.
-->

```mermaid
classDiagram
    class SchemeRouter {
        +filter_schemes(request: FilterRequestDTO, db: Session) FilterResponseDTO
    }
    class SchemeService {
        -repository: SchemeRepository
        +filter_schemes(criteria: FilterCriteria) FilterResponseDTO
        +validate_budget_range(min: Decimal, max: Decimal) bool
    }
    class SchemeRepository {
        -db: Session
        +query_matching(criteria: FilterCriteria) List~Scheme~
    }
    class Scheme {
        +UUID id
        +String title
        +Decimal budget_cap
        +String category
    }

    SchemeRouter ..> SchemeService : invokes
    SchemeService --> SchemeRepository : delegates
    SchemeRepository ..> Scheme : queries
```

### Concrete File & Method Signatures
- **Boundary**: `backend/src/schemes/router.py`
  - `POST /api/schemes/filter` -> `schemas.FilterResponseDTO`
- **Controller**: `backend/src/schemes/service.py`
  - `def filter_schemes(self, criteria: FilterCriteria) -> FilterResponseDTO:`
- **Entity**: `backend/src/schemes/models.py`
  - `class Scheme(SQLModel, table=True):`

---

## 7. Critical Design Review (CDR) Checkpoint Gate
<!--
  Rosenberg Gate: Must pass CDR before writing any production code.
-->

| CDR Criteria | Status | Evidence / Notes |
|---|:---:|---|
| **1. Method Allocation** | PASS / FAIL | Every message in sequence diagram maps to a class method. |
| **2. Class Signatures** | PASS / FAIL | Parameter types, return types, and exceptions defined. |
| **3. Test Plan Feasibility** | PASS / FAIL | Every controller method and boundary endpoint is unit-testable. |
| **4. PDR Traceability** | PASS / FAIL | All controllers from robustness diagrams exist in class models. |

*GATE STATUS*: **[APPROVED TO PROCEED TO IMPLEMENTATION]**

---

## 8. Version Control & Git Milestone Plan
| Milestone / Phase | Scope / Layer | Commit Type & Suggested Message | Verification Required |
|---|---|---|---|
| **Phase 1: Setup** | Infrastructure & Config | `chore(setup): scaffold [FEATURE] directory layout & deps` | Config linting passes |
| **Phase 2: Foundation** | Entity & Schema Migrations | `feat(core): implement database models & migrations` | Migration up/down passes |
| **Phase 3+: UC-1 (MVP)** | Boundary + Controller + Entity | `feat(UC-1): complete UC-1 flow and tests [Major Milestone]` | Integration test suite green |
| **Phase N: Final Release**| Documentation & Cleanup | `chore(release): complete [FEATURE] verification and documentation`| Full test suite green |
