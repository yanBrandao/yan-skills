# Kotlin DDD Patterns

## Input Use Case

```kotlin
interface AddSomeUseCase {
    fun add(command: AddSomeCommand): Some
}
```

Use commands for input when the payload has meaning beyond a primitive.

```kotlin
data class AddSomeCommand(
    val info: String = Strings.EMPTY,
)
```

## Output Port

```kotlin
interface SomeRepositoryPort {
    fun save(some: Some): Some
}
```

Ports belong to the application layer. Name them around application needs, not infrastructure technology. Prefer `SomeRepositoryPort` over `JpaSomeRepository` in `application.port.output.port`.

## Service

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

Services are allowed to:

- Inject output ports.
- Implement input use cases.
- Start transactions when the project convention places transactions at service level.
- Coordinate multiple domain objects or ports.
- Log meaningful orchestration events.

Services should avoid:

- Encoding business predicates that fit in the domain.
- Importing adapter implementations.
- Returning persistence entities from output adapters unless that is already the project convention.
- Logging sensitive data, full payloads, secrets, credentials, tokens, or personally identifiable information.

## Domain

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

Domain classes are responsible for:

- Business decisions.
- Business predicates.
- State transitions.
- Domain constants.
- Calling ports when the method represents domain behavior that requires persistence or publishing.
- Logging important decisions and state transitions without exposing sensitive values.

When a domain method accepts a port, keep the method expressive. Prefer `some.save(repositoryPort)` over a service doing all the repository orchestration when saving is part of the domain behavior.

## Input Adapter

```kotlin
@RestController
class SomeController(
    private val addSomeUseCase: AddSomeUseCase,
) {
    @PostMapping("/some")
    fun add(@RequestBody request: AddSomeRequest): SomeResponse {
        val some = addSomeUseCase.add(request.toCommand())
        return SomeResponse.from(some)
    }
}
```

Input adapters should translate inbound transport concerns into use case calls. Keep request validation and mapping here or in adjacent DTO mappers.

## Output Adapter

```kotlin
@Repository
class SomeRepositoryAdapter(
    private val repository: SpringDataSomeRepository,
) : SomeRepositoryPort {
    override fun save(some: Some): Some {
        return repository.save(SomeEntity.from(some)).toDomain()
    }
}
```

Output adapters should implement ports and hide infrastructure details from the application layer.

## Tests

Always add unit tests for changed domain classes and services. These are the most important layers in this architecture. Prefer fast domain tests for business rules:

```kotlin
class SomeTest {
    @Test
    fun `identifies matching info`() {
        val some = Some(info = "value")

        assertThat(some.haveSome("value")).isTrue()
    }
}
```

Add service unit tests for orchestration and port interactions:

```kotlin
class SomeServiceTest {
    private val someRepository = mockk<SomeRepositoryPort>()
    private val service = SomeService(someRepository)

    @Test
    fun `adds some`() {
        val expected = Some(info = "value")
        every { someRepository.save(expected) } returns expected

        val result = service.add(AddSomeCommand(info = "value"))

        assertThat(result).isEqualTo(expected)
        verify { someRepository.save(expected) }
    }
}
```
