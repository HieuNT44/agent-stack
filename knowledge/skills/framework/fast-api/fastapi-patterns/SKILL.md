---
name: fastapi-patterns
description: Code patterns for layered FastAPI (async or sync): route + dependency factory, service, repository, Pydantic v2 schemas, typed errors. Project-agnostic; reads Project bindings from CLAUDE.md. Use when writing or reviewing FastAPI code and you need the exact shape to copy; for a full new feature use fastapi-new-feature.
---

# FastAPI patterns (generic)

Principles live in `.claude/rules/fastapi-*.md`. This skill = code shapes to copy.
**First** read repo `CLAUDE.md` → *Project bindings* (paths, `AUTH_DEP`, `SESSION_DEP`, `RESPONSE_HELPER`, exceptions, logger). Mirror the closest existing feature. Names below are placeholders.

If bindings are missing, run `fastapi-bootstrap` first.

## 1. Layout (typical; real map is in bindings)
```
<app>/
├── main.py                      # app, lifespan, exception handlers, router include
├── presentation/ (api)          # controllers/routes, request/response schemas, deps (auth)
├── application/ (services)      # services, DTOs, repository interfaces
├── domain/                      # entities/ORM models, enums
├── infrastructure/              # repository impls, db session, external clients
└── common/                      # logger, exceptions, response helpers, decorators
```
Direction: `presentation → application → domain ← infrastructure`.

## 2. Route + DI factory
```python
router = APIRouter(prefix="/v1/<resources>", tags=["<resources>"])

def get_service(session: Annotated[AsyncSession, Depends(<SESSION_DEP>)]) -> <Feature>Service:
    return <Feature>Service(<Entity>Repository(session))      # thin factory

# Plain model as response_model:
@router.get("/{item_id}", response_model=<Item>Response, status_code=200, summary="Get <item>")
async def get_item(
    item_id: int,
    principal: Annotated[<Principal>, Depends(<AUTH_DEP>)],
    service: Annotated[<Feature>Service, Depends(get_service)],
):
    return await service.get(item_id, owner_id=principal.user_id)

# If the project wraps responses in an envelope (<RESPONSE_HELPER>), follow it instead and
# declare the envelope type (e.g. ApiResponse[<Item>Response]) or omit response_model —
# never declare a model the route doesn't return.
```
Class-based controllers are fine if the repo uses them — follow the repo.

## 3. Service (framework-free)
```python
class <Feature>Service:
    def __init__(self, repo: <Entity>RepositoryInterface) -> None:
        self._repo = repo

    async def get(self, item_id: int, owner_id: int) -> <Item>DTO:
        entity = await self._repo.get_by_id_for_owner(item_id, owner_id)
        if entity is None:
            raise NotFoundException(...)
        return <Item>DTO.model_validate(entity)
```

## 4. Repository
```python
class <Entity>Repository(<Entity>RepositoryInterface):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, entity: <Entity>) -> <Entity>:
        try:
            self.session.add(entity)
            await self.session.flush()          # commit owned by session dependency
            return entity
        except SQLAlchemyError as e:
            <LOGGER>(f"<Entity>Repository.create failed: {e}")
            raise
```
Details: `sqlalchemy` skill.

## 5. Schemas (Pydantic v2)
```python
class <Item>Create(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str, Field(min_length=1, max_length=100)]

class <Item>Update(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str | None, Field(min_length=1, max_length=100)] = None
# patch: data = body.model_dump(exclude_unset=True)

class <Item>Response(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
```

## 6. Errors
Services raise typed exceptions (`BadRequest/Unauthorized/Forbidden/NotFound/Conflict/Internal`); a global handler maps to one error envelope. Controllers don't build error JSON by hand. Log server-side; generic message to client.

## 7. New feature order
schemas → DTO → repo interface → repo impl → service → route + factory → register router → tests. (Full flow: `fastapi-new-feature`.)

## 8. Review checklist
See `fastapi-review`. Quick: session via dependency · ORM only in repos · auth dep + owner scope · `response_model` + status code · paginated lists · typed errors · no blocking call in `async def` · router registered · tests.

## 9. Sync variant
Sync repo: `def` routes/services/repos, `Session` (no `await`, no `AsyncSession`), `TestClient`. Layer rules unchanged. Don't mix `async def` routes with sync DB calls.

## 10. App skeleton (lifespan, settings, handlers)
```python
@lru_cache
def get_settings() -> Settings: return Settings()            # pydantic-settings BaseSettings

@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    app.state.engine = create_async_engine(s.db_url, pool_pre_ping=True)
    app.state.session_factory = async_sessionmaker(app.state.engine, expire_on_commit=False)
    app.state.http = httpx.AsyncClient(timeout=httpx.Timeout(10, connect=3))
    yield
    await app.state.http.aclose(); await app.state.engine.dispose()

app = FastAPI(lifespan=lifespan)

@app.exception_handler(AppError)                              # typed errors → one envelope
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"error": {"code": exc.code, "message": exc.message}})

app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router)                               # single registry
```
Middleware: prefer pure ASGI over `BaseHTTPMiddleware`. Uploads: `UploadFile` with size/type checks; stream large bodies.
