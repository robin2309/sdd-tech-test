## Data Model & Versioning Strategy

The data model is designed to separate the identity and global metadata of a template (which remain stable) from its content and variables (which evolve over time). This allows us to meet the strict versioning requirements outlined in the PRD.

### Entities

#### 1. `Template`
Represents the root identity of a prompt template.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key | Unique identifier of the template. |
| `name` | String | Not Null | Name of the template (used for searching). |
| `tags` | String[] | Optional | List of tags for categorization and filtering. |
| `created_at` | Datetime | Not Null, Default: NOW() | Creation date and time of the root template. |

#### 2. `TemplateVersion`
Represents a specific and immutable iteration of a template's content.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key | Unique identifier of the version. |
| `template_id` | String (UUID) | Foreign Key, Not Null | Reference to the parent `Template`. |
| `version` | Integer | Not Null | Version number (e.g., 1, 2, 3...). |
| `variables` | JSON | Optional | Declaration of expected variables. Expected format: array of objects `[{"name": "string", "default": "string"}]`. |
| `content` | String | Not Null | The text content of the prompt containing `{{variable}}` placeholders. |
| `created_at` | Datetime | Not Null, Default: NOW() | Creation date and time of this specific version. |

### Relationships
*   **One-to-Many (1:N)**: A `Template` has one or more `TemplateVersion`s.
*   The relationship is established via the `template_id` field in the `TemplateVersion` entity, which points to the `id` of the `Template` entity.

### Versioning Strategy
To meet the PRD requirements ("each update creates a new version; previous versions must remain accessible"):

1.  **Creation (Create)**: When a template is created, the system inserts a record into the `Template` table and simultaneously creates the first record in the `TemplateVersion` table with `version = 1`.
2.  **Update**: `TemplateVersion` records are **immutable** (Append-only). When updating a template's content or variables, the `Template` record remains intact, and a *new* `TemplateVersion` entry is inserted with `version = MAX(version) + 1` for that specific `template_id`.
3.  **Retrieve Latest Version**: By default, fetching a template retrieves the `Template` entity along with the associated `TemplateVersion` that has the highest `version` number.
4.  **Retrieve a Historical Version**: To get a specific older version, the system queries a `TemplateVersion` by filtering on both the `template_id` and the specific `version` number requested.

Here is the Markdown for the refined architecture. You can copy and paste this
directly into the Architecture overview section of your SPEC.md file.

## Architecture Overview

To meet the PRD constraints—specifically high testability and the ability to expose the rendering logic to internal services outside of HTTP—the application follows a **Clean Architecture / Hexagonal Architecture (Ports & Adapters)** pattern. 

This ensures a strict separation of concerns where the core business logic is completely isolated from external frameworks, databases, and delivery mechanisms (HTTP).

### Layer Breakdown

#### 1. Domain Layer (The Core)
This layer contains the pure business rules and state. It has **zero dependencies** on any other layer or external library.
*   **Entities:** `Template` and `TemplateVersion`. These are pure data structures containing the business rules for what constitutes a valid template.
*   **Domain Services:** `TemplateRenderer`. A pure function/class responsible for the core logic of parsing a template string, replacing `{{variables}}`, and throwing specific domain errors if required variables are missing.
*   **Ports (Interfaces):** `ITemplateRepository`. Defines the contract for how templates are saved and retrieved, without knowing *how* it's implemented.

#### 2. Application Layer (Use Cases)
This layer orchestrates the flow of data to and from the Domain entities. It acts as the entry point for any consumer (HTTP API, CLI, or future internal microservices).
*   **Use Cases:** Classes like `CreateTemplate`, `RenderTemplate`, `GetTemplate`, and `UpdateTemplate`.
*   **Responsibility:** A use case typically fetches data via a repository interface, passes it to a domain entity/service to perform business logic, and returns the result. 
*   *Note:* By isolating this layer, we guarantee that the `RenderTemplate` logic can be called internally by another service without going through the HTTP stack.

#### 3. Infrastructure Layer (Outer Ring)
This layer contains all the implementation details and external integrations. Dependencies point *inward* toward the Application and Domain layers.
*   **Driving Adapters (Delivery):** The `HTTP Controller` (e.g., Express/FastAPI routers). It parses incoming HTTP requests, validates payloads using **DTOs (Data Transfer Objects)**, calls the appropriate Application Use Case, and formats the output back into HTTP responses (JSON + Status Codes).
*   **Driven Adapters (Persistence):** The concrete implementation of the `ITemplateRepository` (e.g., `InMemoryTemplateRepository` for initial development/testing, or `PostgresTemplateRepository` for production).

### Data Flow Example (Rendering a Template)

```mermaid
sequenceDiagram
    participant Client
    participant Controller as HTTP Controller
    participant UseCase as RenderTemplate UseCase
    participant Repo as ITemplateRepository (Adapter)
    participant Domain as TemplateRenderer (Domain)

    Client->>Controller: POST /templates/{id}/render (variables)
    Controller->>UseCase: execute(id, variables)
    UseCase->>Repo: getLatestVersion(id)
    Repo-->>UseCase: TemplateVersion Entity
    UseCase->>Domain: render(TemplateVersion.content, variables)
    Domain-->>UseCase: renderedString
    UseCase-->>Controller: renderedString
    Controller-->>Client: 200 OK { "rendered_prompt": "..." }

Why this architecture?

1.  Framework Agnostic: The core logic doesn't care if we use Express, Fastify,
    or FastAPI.
2.  Highly Testable: The Domain and Application layers can be tested using fast,
    isolated unit tests by mocking the ITemplateRepository. We don't need a
    database to test the TemplateRenderer.
3.  Future-Proof: Swapping the persistence layer (e.g., moving from in-memory to
    PostgreSQL) only requires writing a new adapter in the Infrastructure layer.
    The core logic remains untouched.
```

