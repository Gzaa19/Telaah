---
description: "Task list template for ICONIX feature implementation with Git version control"
---

# Tasks: [FEATURE NAME] – ICONIX Implementation Plan

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: `plan.md` (PDR & CDR Approved), `spec.md`, `research.md`, `data-model.md`
**Methodology Reference**: Doug Rosenberg's ICONIX Process (BCE Architecture: Tests → Entity → Controller → Boundary)

---

## Git Version Control Rules (Mandatory)
1. **Atomic Per-Task Commits**: After completing any implementation task and verifying its test, execute:
   `git add <modified-files> && git commit -m "<type>(<scope>): <concise description>"`
2. **Major Checkpoint Commits**: At the conclusion of each Phase and upon completing each Use Case (ICONIX UC), execute the designated **Major Milestone Commit**.
3. **Commit Convention**: Follow Conventional Commits (`feat:`, `test:`, `refactor:`, `chore:`, `fix:`).

---

## Phase 1: Setup & Environment Initialization

**Purpose**: Scaffolding directories, configurations, and dependencies.

- [ ] T001 Initialize feature directory layout according to plan.md
- [ ] T002 Configure dependencies and environment settings
- [ ] T003 [P] Configure linters, formatters, and test runner configurations
- [ ] T004 **Git Major Commit**: `git add . && git commit -m "chore(setup): scaffold [FEATURE NAME] structure and configuration"`

---

## Phase 2: Foundational Entity Layer & Database Migrations

**Purpose**: Establish database schemas, entity models, and migration scripts required before use case controllers can run.

- [ ] T005 Create database migration script (Alembic) for new entity tables
- [ ] T006 Implement Entity SQLModel classes in `backend/src/[feature]/models.py`
- [ ] T007 [P] Implement base Repository methods in `backend/src/[feature]/repository.py`
- [ ] T008 Run migration in test environment and verify table creation
- [ ] T009 **Git Major Commit**: `git add . && git commit -m "feat(core): implement database migrations and foundational entity models"`

**PDR Verification Checkpoint**: Entity models conform to Updated Domain Model in `plan.md`.

---

## Phase 3: Use Case 1 (UC-1) – [Title] (Priority: P1) [MVP]

**Goal**: [Describe primary actor goal and sunny day deliverable]
**Independent Test**: [Command to run tests verifying UC-1 independently]

### Step 3.1: Unit & Integration Tests (TDD - Write First)
- [ ] T010 [P] [UC1] Write unit tests for Controller (Service business logic) in `backend/tests/[feature]/test_service.py`
- [ ] T011 [P] [UC1] Write contract/integration tests for Boundary (FastAPI Router) in `backend/tests/[feature]/test_router.py`
- [ ] T012 [UC1] Verify tests FAIL prior to implementation (Red stage)
- [ ] T013 [UC1] **Git Commit (Tests)**: `git add backend/tests/ && git commit -m "test(UC1): add failing test suite for [Title]"`

### Step 3.2: Controller Layer (Business Logic & Validation)
- [ ] T014 [P] [UC1] Implement request and response Pydantic DTOs in `backend/src/[feature]/schemas.py`
- [ ] T015 [UC1] Implement Controller service methods in `backend/src/[feature]/service.py`
- [ ] T016 [UC1] Verify unit tests pass (Green stage)
- [ ] T017 [UC1] **Git Commit (Controller)**: `git add backend/src/[feature]/ && git commit -m "feat(UC1): implement controller service logic and DTOs"`

### Step 3.3: Boundary Layer (API Router & Frontend GUI)
- [ ] T018 [UC1] Implement FastAPI Router endpoint in `backend/src/[feature]/router.py`
- [ ] T019 [P] [UC1] Implement Frontend GUI component/modal in `frontend/src/components/[feature]/`
- [ ] T020 [UC1] Implement API client integration in `frontend/src/lib/api/[feature].ts`
- [ ] T021 [UC1] Wire Frontend GUI to API client and handle loading/error states

### Step 3.4: BCE Audit & Major Milestone Checkpoint
- [ ] T022 [UC1] **BCE Audit**: Confirm Frontend & Router (Boundary) never query Database (Entity) directly
- [ ] T023 [UC1] Run integration tests and confirm all sunny-day and rainy-day flows pass
- [ ] T024 [UC1] **Git Major Commit (Milestone)**: `git add . && git commit -m "feat(UC1): complete [Title] use case end-to-end [MVP Milestone]"`

**Checkpoint**: Use Case 1 is fully functional and delivers an independently testable MVP.

---

## Phase 4: Use Case 2 (UC-2) – [Title] (Priority: P2)

**Goal**: [Describe secondary use case deliverable]
**Independent Test**: [Verification command]

### Step 4.1: Tests (TDD)
- [ ] T025 [P] [UC2] Write unit and integration tests for UC-2
- [ ] T026 [UC2] **Git Commit (Tests)**: `git add backend/tests/ && git commit -m "test(UC2): add test suite for [Title]"`

### Step 4.2: Controller & Entity Extensions
- [ ] T027 [P] [UC2] Implement additional entity query methods
- [ ] T028 [UC2] Implement UC-2 Controller service logic and validations

### Step 4.3: Boundary & Integration
- [ ] T029 [UC2] Implement UC-2 Router endpoints and Frontend GUI components
- [ ] T030 [UC2] **BCE Audit**: Confirm strict adherence to Boundary-Controller-Entity separation
- [ ] T031 [UC2] **Git Major Commit (Milestone)**: `git add . && git commit -m "feat(UC2): complete [Title] use case end-to-end"`

---

## Phase N: Verification, Documentation & Final Release

**Purpose**: Cross-cutting audit, full regression test, and release milestone.

- [ ] T032 Run complete test suite (backend unit/integration tests + frontend build check)
- [ ] T033 Verify zero breaking changes and ensure all CDR criteria are fulfilled
- [ ] T034 [P] Update API documentation, Swagger specs, and user guides
- [ ] T035 Code formatting, linting, and unused import cleanup
- [ ] T036 **Git Major Commit (Release)**: `git add . && git commit -m "chore(release): finalize [FEATURE NAME] implementation, verification, and documentation"`
