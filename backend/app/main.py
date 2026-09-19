import logging
from contextlib import asynccontextmanager

from app.api.routes import router
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


app.include_router(router)
