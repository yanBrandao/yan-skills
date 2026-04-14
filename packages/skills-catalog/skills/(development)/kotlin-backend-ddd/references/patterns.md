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

Always add unit tests for changed domain classes and services. These are the most important layers in this architecture.

### Dependencies

Use `mockito-kotlin` and `instancio-kotlin`. Before adding either dependency, check the latest compatible version for the current project — known stable releases at time of writing are `6.3.0` and `6.0.0-RC2` respectively.

```kotlin
// build.gradle.kts
testImplementation("org.mockito.kotlin:mockito-kotlin:<version>")
testImplementation("org.instancio:instancio-kotlin:<version>")
```

### Generating test data with Instancio

Use `KInstancio` to generate realistic random objects instead of hand-coding every field. This removes noise from tests and keeps focus on what is actually being verified.

Create a fully random instance when no specific field value matters:

```kotlin
val some = KInstancio.create<Some>()
```

Override only the fields that are meaningful for the test scenario using `set(field(...), value)`:

```kotlin
val some = KInstancio.of<Some>()
    .set(field(Some::info), "expected-value")
    .create()
```

Override multiple fields:

```kotlin
val command = KInstancio.of<AddSomeCommand>()
    .set(field(AddSomeCommand::info), "specific-info")
    .create()
```

Use a random instance as the return value of a stub when the test only cares that the service propagates it:

```kotlin
val saved = KInstancio.create<Some>()
whenever(someRepository.save(any())).thenReturn(saved)

val result = service.add(KInstancio.create<AddSomeCommand>())

assertThat(result).isEqualTo(saved)
```

### Domain test

Prefer fast, pure domain tests for business rules — no mocks needed:

```kotlin
class SomeTest {
    @Test
    fun `identifies matching info`() {
        val some = KInstancio.of<Some>()
            .set(field(Some::info), "value")
            .create()

        assertThat(some.haveSome("value")).isTrue()
    }

    @Test
    fun `does not match different info`() {
        val some = KInstancio.of<Some>()
            .set(field(Some::info), "value")
            .create()

        assertThat(some.haveSome("other")).isFalse()
    }
}
```

### Service test — stub return value

Use `whenever(...).thenReturn(...)` to stub a port method that returns a value:

```kotlin
class SomeServiceTest {
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
}
```

### Service test — stub with argument matchers

Use `any()` or `eq()` from `org.mockito.kotlin` when the exact argument does not matter or is constructed inside the method under test:

```kotlin
@Test
fun `returns whatever the repository saves`() {
    val saved = KInstancio.create<Some>()
    whenever(someRepository.save(any())).thenReturn(saved)

    val result = service.add(KInstancio.create<AddSomeCommand>())

    assertThat(result).isEqualTo(saved)
}
```

### Service test — stub Unit method with doNothing

Use `doNothing().whenever(mock).method(...)` for methods that return `Unit`:

```kotlin
@Test
fun `publishes event without error`() {
    whenever(someRepository.save(any())).thenReturn(KInstancio.create<Some>())
    doNothing().whenever(somePublisher).publish(any())

    service.add(KInstancio.create<AddSomeCommand>())

    verify(somePublisher).publish(any())
}
```

### Service test — verify not called

```kotlin
@Test
fun `does not publish when save fails`() {
    whenever(someRepository.save(any())).thenThrow(RuntimeException("db error"))

    assertThrows<RuntimeException> {
        service.add(KInstancio.create<AddSomeCommand>())
    }

    verify(somePublisher, never()).publish(any())
}
```

### Service test — capture argument

Use `argumentCaptor` when you need to assert on the exact value passed to a port:

```kotlin
@Test
fun `saves some with info from command`() {
    val command = KInstancio.create<AddSomeCommand>()
    val captor = argumentCaptor<Some>()
    whenever(someRepository.save(any())).thenReturn(KInstancio.create<Some>())

    service.add(command)

    verify(someRepository).save(captor.capture())
    assertThat(captor.firstValue.info).isEqualTo(command.info)
}
```

### Service test — stub exception

```kotlin
@Test
fun `propagates repository failure`() {
    whenever(someRepository.save(any())).thenThrow(RuntimeException("db error"))

    assertThrows<RuntimeException> {
        service.add(KInstancio.create<AddSomeCommand>())
    }
}
```

### Controller test — MockMvc

Use `@WebMvcTest` to test controllers in isolation. Mock every use case the controller depends on. Add `@MockitoBean` (Spring Boot 3.4+) or `@MockBean` for older versions.

```kotlin
@WebMvcTest(SomeController::class)
class SomeControllerTest {
    @Autowired
    lateinit var mockMvc: MockMvc

    @MockitoBean
    lateinit var addSomeUseCase: AddSomeUseCase

    @MockitoBean
    lateinit var getSomeUseCase: GetSomeUseCase
}
```

#### 201 Created — POST creates a new entity

```kotlin
@Test
fun `returns 201 when entity is created`() {
    val created = KInstancio.create<Some>()
    whenever(addSomeUseCase.add(any())).thenReturn(created)

    mockMvc.perform(
        post("/some")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(KInstancio.create<AddSomeRequest>()))
    )
        .andExpect(status().isCreated)
        .andExpect(jsonPath("$.info").value(created.info))
}
```

#### 200 OK — GET returns existing entity

```kotlin
@Test
fun `returns 200 with entity body`() {
    val some = KInstancio.create<Some>()
    whenever(getSomeUseCase.get(any())).thenReturn(some)

    mockMvc.perform(get("/some/{id}", some.id))
        .andExpect(status().isOk)
        .andExpect(jsonPath("$.info").value(some.info))
}
```

#### 404 Not Found — entity does not exist

Throw a dedicated exception from the use case mock and rely on a `@ControllerAdvice` or `ResponseStatusException` to map it:

```kotlin
@Test
fun `returns 404 when entity is not found`() {
    whenever(getSomeUseCase.get(any()))
        .thenThrow(SomeNotFoundException("not found"))

    mockMvc.perform(get("/some/{id}", UUID.randomUUID()))
        .andExpect(status().isNotFound)
}
```

#### 403 Forbidden — endpoint requires a role

Use `@WithMockUser` from `spring-security-test` to simulate an authenticated principal. Set `roles` to the required role or omit it to test that a user without the role is rejected:

```kotlin
@Test
@WithMockUser(roles = ["ADMIN"])
fun `returns 200 for user with required role`() {
    whenever(getSomeUseCase.get(any())).thenReturn(KInstancio.create<Some>())

    mockMvc.perform(get("/some/{id}", UUID.randomUUID()))
        .andExpect(status().isOk)
}

@Test
@WithMockUser(roles = ["USER"])
fun `returns 403 for user without required role`() {
    mockMvc.perform(get("/some/{id}", UUID.randomUUID()))
        .andExpect(status().isForbidden)
}
```

Use `@WithAnonymousUser` to verify that unauthenticated requests are rejected (typically `401`):

```kotlin
@Test
@WithAnonymousUser
fun `returns 401 for unauthenticated request`() {
    mockMvc.perform(get("/some/{id}", UUID.randomUUID()))
        .andExpect(status().isUnauthorized)
}
```
