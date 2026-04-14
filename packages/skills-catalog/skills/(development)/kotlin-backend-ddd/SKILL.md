---
name: kotlin-backend-ddd
description: Use when creating, reviewing, or refactoring Kotlin Spring Boot backend code that should follow Yan's DDD package structure with adapters, application ports, services, domain-owned business logic, required service/domain unit tests, and logger usage in service/domain classes. Trigger when the user mentions Kotlin backend DDD, Spring Boot project structure, adapters input/output, use cases, repository ports, publisher ports, consumers, service/domain tests, or logging in this style. Do NOT use for frontend work, non-Kotlin services, generic CRUD-only code without architecture concerns, or DDD approaches that intentionally differ from this package convention.
license: CC-BY-4.0
metadata:
  author: Yan
  version: "1.0.0"
---

# Kotlin Backend DDD

Apply Yan's Kotlin Spring Boot DDD style. Keep business logic in domain classes, dependency injection in application services, and infrastructure details in adapters. Treat domain and service unit tests as mandatory because these are the most important layers.

## Workflow

1. Inspect the existing Spring Boot package layout before changing code.
2. Preserve local naming conventions when they already exist.
3. Add or update domain behavior first.
4. Add input ports as use case interfaces.
5. Add output ports as interfaces consumed by services and implemented by output adapters.
6. Add services that inject ports and implement use cases.
7. Add logger instances to service and domain classes and log meaningful lifecycle/business events.
8. Add input adapters for web controllers or consumers.
9. Add output adapters for repositories, publishers, documentation, and external systems.
10. Add focused unit tests for every changed service and domain class.

Load `references/package-layout.md` when creating or reorganizing folders. Load `references/patterns.md` when implementing domain, use case, port, service, adapter, or test code.

## Package Layout

Use this default layout inside a bounded context or feature package:

```text
configuration/
  (configuration)
adapter/
  input/
    web/
    consumers/
  output/
    repository/
    publishers/
    documentation/
application/
  domain/
  port/
    input/
      (usecase)
    output/
      (port)
  service/
```

## Layer Rules

- Put web controllers and message consumers in `adapter.input`.
- Put persistence, publisher, documentation, and external integration implementations in `adapter.output`.
- Put domain classes in `application.domain`.
- Put use case interfaces in `application.port.input`.
- Put output port interfaces in `application.port.output`.
- Put Spring services in `application.service`.
- Let services inject output ports and implement input use cases.
- Let domain classes own decisions, validations, state transitions, and business predicates.
- Let adapters translate transport or infrastructure details into application calls.
- Add loggers to service and domain classes so important actions and decisions can be traced.
- Add unit tests for service and domain layers whenever they are created or changed.

## Service Pattern

Services coordinate dependencies. They should stay thin and delegate business decisions to domain objects.

```kotlin
private val logger = LoggerFactory.getLogger(SomeService::class.java)

@Service
class SomeService(
    private val someRepository: SomeRepositoryPort,
) : AddSomeUseCase, CreateSomeUseCase {
    override fun add(command: AddSomeCommand): Some {
        logger.info("Adding Some")
        val some = Some(info = command.info)
        return some.save(someRepository)
    }
}
```

## Domain Pattern

Domain classes should expose behavior rather than forcing services to manipulate data directly.

```kotlin
data class Some(
    val info: String = Strings.EMPTY,
) {
    fun save(someRepository: SomeRepositoryPort): Some {
        logger.info("Saving Some with identification={}", SOME_IDENTIFICATION)
        return someRepository.save(this)
    }

    fun haveSome(some: String): Boolean {
        val result = info == some
        logger.debug("Checking Some info match result={}", result)
        return result
    }

    companion object {
        private val logger = LoggerFactory.getLogger(Some::class.java)
        const val SOME_IDENTIFICATION = "SomeId"
    }
}
```

## Output Port Pattern

Output ports describe what the application needs, not how infrastructure does it.

```kotlin
interface SomeRepositoryPort {
    fun save(some: Some): Some
}
```

## Implementation Guardrails

- Prefer explicit input and output port interfaces over direct adapter imports in services.
- Avoid putting business rules in controllers, consumers, repository adapters, publisher adapters, or documentation adapters.
- Avoid injecting repositories or publishers directly if a port interface should exist.
- Avoid anemic domains when behavior belongs naturally on the domain class.
- Keep adapter DTOs out of domain classes.
- Avoid leaving services or domains without unit tests.
- Avoid leaving services or domains without loggers when they contain behavior or orchestration.
- Avoid logging sensitive data, full payloads, secrets, credentials, tokens, or personally identifiable information.
- Keep changes scoped to the relevant bounded context unless the user asks for a broader refactor.

## Validation

Before finishing, check:

- Domain behavior is testable without Spring.
- Domain classes with behavior have unit tests.
- Services have unit tests for their orchestration and port interactions.
- Service and domain classes include logger usage for meaningful events and decisions.
- Services implement use cases and inject only ports or stable collaborators.
- Output adapters implement output ports.
- Input adapters call use cases, not repositories.
- No infrastructure concern leaked into `application.domain`.
- Tests cover meaningful domain behavior and every service path touched by the change.
