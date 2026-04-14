# yan-skills

Personal AI agent skills catalog for my own backend, architecture, and workflow conventions. Skills are installed into Claude Code and invoked as slash commands.

## Installation

```bash
npx yanskills
```

This copies all skills into `~/.claude/skills/` so Claude Code picks them up automatically.

## Skills

### `kotlin-backend-ddd`

Guides Claude Code when creating, reviewing, or refactoring Kotlin Spring Boot services that follow a DDD-based layered architecture.

#### What is DDD?

Domain-Driven Design (DDD) is an approach to software development that centers the codebase on the business domain rather than on technical concerns. The core idea is that the code should reflect the language and rules of the business — so when a business rule changes, there is one clear place in the code that owns that rule.

In practice this means:

- **Domain classes own business decisions.** A `Some` domain class knows how to validate itself, transition its own state, and call ports when it needs to persist or publish. Services should not reach into domain objects and manipulate their data directly.
- **The application layer is isolated from infrastructure.** Domain classes and services never import JPA entities, HTTP types, or message broker details. Those details live in adapters.
- **Ports describe what the application needs, not how infrastructure works.** A `SomeRepositoryPort` interface says "I need to save and find Somes." The JPA adapter that implements it is an infrastructure detail the application layer never sees.

#### Why layers?

Each layer has a single responsibility and a strict dependency direction:

```
adapter.input  ──►  application.port.input.usecase
                              │
                    application.service
                       │             │
              application.domain   application.port.output.port
                                             │
                                      adapter.output
```

| Layer | Lives in | Responsibility |
|---|---|---|
| Input adapter | `adapter.input.web`, `adapter.input.consumers` | Translate HTTP or message events into use case calls |
| Use case port | `application.port.input.usecase` | Define what operations the application exposes |
| Service | `application.service` | Orchestrate ports and domain objects, implement use cases |
| Domain | `application.domain` | Own business rules, decisions, and state transitions |
| Output port | `application.port.output.port` | Define what the application needs from infrastructure |
| Output adapter | `adapter.output.repository`, `adapter.output.publishers` | Implement output ports using real infrastructure |

This layering means:

- Business rules can be tested without starting Spring or a database.
- Infrastructure (database, broker, HTTP client) can be swapped without touching domain or service code.
- Input channels (REST, consumer, CLI) can be added without touching the application layer.

#### Package layout

```text
adapter/
  input/
    web/              ← REST controllers
    consumers/        ← message listeners
  output/
    repository/       ← persistence adapters
    publishers/       ← event/message publisher adapters
    documentation/    ← OpenAPI adapters when separated
application/
  domain/             ← domain classes, value objects, predicates
  port/
    input/
      usecase/        ← use case interfaces
    output/
      port/           ← output port interfaces
  service/            ← Spring services
```

Dependency rule: adapters depend on ports, never the reverse. Domain and ports never import from adapters.

#### How tests are defined

Tests are split by layer and have different tools and goals at each level.

**Domain tests** — fast, no Spring, no mocks:

Domain behavior is pure Kotlin. Tests instantiate domain classes directly and assert on their output. `KInstancio` generates random objects so tests stay focused on the one field that matters.

```kotlin
val some = KInstancio.of<Some>()
    .set(field(Some::info), "expected")
    .create()

assertThat(some.haveSome("expected")).isTrue()
```

**Service tests** — unit tests with mocked ports:

Services are tested with `mockito-kotlin`. All ports are mocked with `mock<T>()`. Stubs use `whenever(...).thenReturn(...)` for return values and `doNothing().whenever(mock).method(...)` for `Unit` methods. `KInstancio` provides random return values when the test only cares about propagation, not the exact content.

```kotlin
private val someRepository: SomeRepositoryPort = mock()
private val service = SomeService(someRepository)

@Test
fun `adds some`() {
    val saved = KInstancio.create<Some>()
    whenever(someRepository.save(any())).thenReturn(saved)

    val result = service.add(KInstancio.create<AddSomeCommand>())

    assertThat(result).isEqualTo(saved)
    verify(someRepository).save(any())
}
```

**Controller tests** — `@WebMvcTest` with mocked use cases:

Controllers are tested with Spring's `MockMvc` in isolation. Use cases are injected as `@MockitoBean`. Tests assert HTTP status codes and response body fields — not business logic.

```kotlin
@WebMvcTest(SomeController::class)
class SomeControllerTest {
    @Autowired lateinit var mockMvc: MockMvc
    @MockitoBean lateinit var addSomeUseCase: AddSomeUseCase

    @Test
    fun `returns 201 when entity is created`() {
        whenever(addSomeUseCase.add(any())).thenReturn(KInstancio.create<Some>())

        mockMvc.perform(
            post("/some")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(KInstancio.create<AddSomeRequest>()))
        )
            .andExpect(status().isCreated)
    }
}
```

Security rules are tested using `@WithMockUser(roles = ["ROLE"])` and `@WithAnonymousUser` to cover `403` and `401` responses without starting a real security context.

#### Test dependencies

Check the latest compatible versions for the project before adding:

```kotlin
testImplementation("org.mockito.kotlin:mockito-kotlin:<version>")  // 6.3.0 known stable
testImplementation("org.instancio:instancio-kotlin:<version>")     // 6.0.0-RC2 known stable
```

---

## Repository structure

```text
packages/skills-catalog/skills/
  _category.json              # valid category registry
  deprecated.yaml             # removed skills with migration notes
  (category-name)/
    skill-name/
      SKILL.md                # required — defines the skill
      references/             # supporting docs loaded on demand
      templates/              # optional code templates
```

## Commands

```bash
npm run validate           # validate all skill folders and frontmatter
npm run generate:registry  # regenerate skills-registry.json
```

Run `validate` after adding or modifying any skill. Run `generate:registry` after any change that should appear in the registry.
