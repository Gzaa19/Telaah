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
  Rosenberg Phase: Domain Model Evolution (Ch. 1 step 2b & Ch. 5, Fig. 5-18/5-19).
  Refines the Initial Domain Model during Robustness Analysis:
  - Add missing domain classes discovered while drawing robustness diagrams.
  - ADD attributes to domain classes (from use cases, UI storyboards, and requirements).
  - STILL NO operations/methods here (operations are allocated later in Section 6: Static Class Model).
-->

```mermaid
classDiagram
    class DomainEntity1 {
        +UUID id
        +String name
        +Enum status
        +DateTime created_at
    }
    class DomainEntity2 {
        +UUID id
        +String title
        +DateTime updated_at
    }
    DomainEntity1 o-- DomainEntity2 : has-a
```
- **Newly Discovered Entities & Attributes**: [Detail domain classes added/refined and their attributes + constraints]
- **Associations**: [Refined `has-a` / `is-a` relationships; multiplicities finalized in Static Class Model]
- **Database Schema Migrations**: [Required Alembic/SQL scripts and indexes]

---

## 3. ICONIX Robustness Analysis (Preliminary Design)
<!--
  Doug Rosenberg's Four Rules of Robustness Analysis (Ch. 5):
  1. Actors can only talk to Boundary objects.
  2. Boundary objects can only talk to Controllers and Actors.
  3. Entity objects can only talk to Controllers.
  4. Controller objects can talk to Boundaries, Entities, and other Controllers (NEVER to Actors directly).
  THE GOLDEN RULE: A Boundary object may NEVER connect directly to an Entity object (no Noun-Noun links).

  Canonical PlantUML Elements ONLY (No Mermaid):
  - Use Case text `note` on the left (Basic Course & Alternate Course)
  - `actor`     : User or external system
  - `boundary`  : Screens, pages, dialogs, API endpoints (never fine-grained UI widgets like buttons)
  - `control`   : Logical functions / verbs (not yet final software classes)
  - `entity`    : Persistent domain objects from the Domain Model
  - `usecase`   : Optional invoked sub-use-case (`<<invokes>>`)
-->

### Robustness Diagram: UC-[ID] [Use Case Title]

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam responseMessageBelowArrow true

note as UC_TEXT
  <b>UC-[ID]: [Use Case Title]</b>
  <b>Basic Course:</b>
  1. [Actor] performs [action] on [Boundary 1].
  2. System validates [input] and processes [logic].
  3. System updates [Entity 1] / [Entity 2] and displays [Boundary 2].

  <b>Alternate Course (Rainy Day):</b>
  - If [rule/validation fails], system displays error on [Boundary 1].
end note

actor "[Actor Name]" as ACTOR
boundary "[Client UI Screen / Page Name]" as B1
boundary "[Confirmation / Result View]" as B2

control "[Validate Input Request]" as C1
control "[Process Business Logic]" as C2
control "[Handle Validation Error]" as C3 #FFCCCC

entity "[Domain Entity 1]" as E1
entity "[Domain Entity 2]" as E2

' Optional: uncomment if this use case invokes another use case
' usecase "[Invoked Use Case]" as UC_SUB

UC_TEXT -[hidden]-> ACTOR

ACTOR --> B1 : [Actor Action]
B1 --> C1 : [Submit Request]
C1 --> C2 : [Sunny Day: Valid]
C1 --> C3 : [Rainy Day: Invalid]
C3 --> B1 : [Show Error]
C2 --> E1 : [Read / Update]
C2 --> E2 : [Read / Update]
C2 --> B2 : [Display Result]
' C2 ..> UC_SUB : <<invokes>>
@enduml
```

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
  Rosenberg Phase: Detailed Design (Ch. 8).
  - Sequence diagrams allocate operations/methods to classes discovered in robustness analysis.
  - Actors, Boundaries, Entities, and Controller responsibilities MUST match 1-to-1 with Section 3 Robustness Diagrams (tag Robustness controllers with `[ControllerClass]` for clear traceability).
  - ~80% of Robustness `control` bubbles become operations/messages on Boundary/Entity/Service classes;
    keep `control` lifelines ONLY for real controller/service classes (e.g., DomainService).
  - Include BOTH Basic Course (Sunny Day) and Alternate Course (Rainy Day) using `alt`/`else`.
  - Keep Use Case text visible on the left margin (`note left`).
  - Use OO method invocations (not raw HTTP CRUD verbs or raw SQL).
  - Canonical PlantUML ONLY (No Mermaid).
-->

### Sequence Diagram: UC-[ID] [Use Case Title]

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "[Actor Name]" as User
boundary "[Client UI Screen]" as GUI
control "[DomainService]" as Service
entity "[DomainEntity1]" as Entity1
entity "[DomainEntity2]" as Entity2
boundary "[Result View]" as ResultGUI

note left of User
  <b>UC-[ID]: [Use Case Title]</b>
  <b>Basic Course:</b>
  1. [Actor] submits [action] on [GUI].
  2. [Service] validates and updates [Entity1] & [Entity2].
  3. [ResultGUI] displays result.

  <b>Alternate Course (Rainy Day):</b>
  - If validation fails, [GUI] displays error message.
end note

User -> GUI : submit_action(input)
GUI -> Service : process_action(input)

alt [Sunny Day: Input Valid]
  Service -> Entity1 : find_or_validate(criteria)
  Entity1 --> Service : entity1_record
  Service -> Entity2 : update_state(payload)
  Entity2 --> Service : updated_record
  Service -> ResultGUI : render_success(updated_record)
  ResultGUI --> User : show_result()
else [Rainy Day: Validation / Business Rule Failure]
  Service --> GUI : validation_error(reason)
  GUI --> User : display_error(reason)
end
@enduml
```

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
