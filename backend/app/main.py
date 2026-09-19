import os

# Must run before numpy is imported: OpenBLAS otherwise allocates buffers for every
# CPU thread and can fail with "Memory allocation still failed" on small machines.
for _var in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS"):
    os.environ.setdefault(_var, "1")

import asyncio
import logging
from contextlib import asynccontextmanager

from app.api.chats import router as chats_router
from app.api.documents import router as documents_router
from app.core.errors import DomainError
from app.services.vectorstore import ensure_collection
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("autobrochure")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SpecSense starting up")
    try:
        await asyncio.to_thread(ensure_collection)
    except Exception:
        # Don't block startup; the collection is required once documents move to Qdrant.
        logger.exception("Could not prepare the Qdrant collection (is Qdrant running?)")
    yield
    logger.info("SpecSense shutting down")


app = FastAPI(title="SpecSense", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error."},
    )


@app.get("/")
async def root():
    return {"service": "SpecSense", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


app.include_router(documents_router)
app.include_router(chats_router)
