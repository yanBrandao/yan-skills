# Package Layout

Use this package shape inside each bounded context or feature package.

```text
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
      usecase/
    output/
      port/
  service/
```

## Folder Responsibilities

`adapter.input.web`: REST controllers, request/response DTO mapping, validation annotations, HTTP status handling.

`adapter.input.consumers`: message listeners and event consumers. Translate incoming messages into use case calls.

`adapter.output.repository`: persistence adapters that implement repository ports.

`adapter.output.publishers`: event or message publisher adapters that implement publisher ports.

`adapter.output.documentation`: OpenAPI, Swagger, or documentation-specific adapter code when the project separates it.

`application.domain`: domain data classes, value objects, domain methods, constants, and business predicates.

`application.port.input.usecase`: use case interfaces implemented by services and consumed by input adapters.

`application.port.output.port`: output port interfaces required by application services and implemented by output adapters.

`application.service`: Spring services that orchestrate ports and implement input use cases.

`src/test/.../application/domain`: unit tests for domain behavior. Keep these fast and independent from Spring when possible.

`src/test/.../application/service`: unit tests for service orchestration, use case implementation, and output port interactions.

## Naming

Prefer these suffixes:

- `UseCase` for input ports, for example `CreateSomeUseCase`.
- `Port` for output ports, for example `SomeRepositoryPort`.
- `Service` for application services, for example `SomeService`.
- `RepositoryAdapter` for persistence implementations.
- `PublisherAdapter` for publisher implementations.
- `Controller` for web input adapters.
- `Consumer` for message input adapters.

## Dependencies

Use this dependency direction:

```text
adapter.input -> application.port.input.usecase
application.service -> application.domain
application.service -> application.port.output.port
adapter.output -> application.port.output.port
adapter.output -> application.domain
```

Tests should follow the same package path as the production class under `src/test`.

Avoid this dependency direction:

```text
application.domain -> adapter.*
application.port.* -> adapter.*
application.service -> adapter.output.*
adapter.input -> adapter.output.*
```
