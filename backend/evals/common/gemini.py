"""Gemini helpers shared by every eval: the DeepEval judge, and staying under
free-tier rate limits.

Free-tier keys allow as few as 5 requests per minute per model and Gemini
answers 503 when a model is overloaded, so every call either waits its turn
(`--rpm`) or waits out the error and retries instead of failing the run.
"""

import asyncio
import logging
import time

from deepeval.models import GeminiModel

# Judge for every eval. The same model as the app's generator, so judging a
# generator eval is self-grading; pass --judge to try a stronger one.
DEFAULT_JUDGE = "gemini-3.1-flash-lite"

RETRIES = 6
WAIT_SECONDS = 60

log = logging.getLogger("eval.gemini")


def is_busy(exc: Exception) -> bool:
    """429 (quota) or 503 (model overloaded): worth waiting out."""
    return any(code in str(exc) for code in ("RESOURCE_EXHAUSTED", "UNAVAILABLE"))


def with_backoff(fn, *args, **kwargs):
    """Call `fn`, waiting out Gemini's per-minute quota or overload."""
    for attempt in range(RETRIES + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            if not is_busy(exc) or attempt == RETRIES:
                raise
            log.warning("Gemini busy, waiting %d s (attempt %d)", WAIT_SECONDS, attempt + 1)
            time.sleep(WAIT_SECONDS)


class RateLimiter:
    """Spaces calls so no more than `rpm` start per minute (None: no limit)."""

    def __init__(self, rpm: float | None = None):
        self._interval = 60 / rpm if rpm else 0
        self._next_at = 0.0
        self._turn = asyncio.Lock()

    async def wait(self) -> None:
        async with self._turn:
            loop = asyncio.get_running_loop()
            delay = self._next_at - loop.time()
            if delay > 0:
                await asyncio.sleep(delay)
            self._next_at = loop.time() + self._interval

    def wait_sync(self) -> None:
        now = time.monotonic()
        if self._next_at > now:
            time.sleep(self._next_at - now)
        self._next_at = time.monotonic() + self._interval


class ThrottledGemini(GeminiModel):
    """GeminiModel that waits its turn under an rpm cap, and waits out a 429
    or 503 instead of failing the metric."""

    def __init__(self, *args, rpm: float | None = None, **kwargs):
        super().__init__(*args, **kwargs)
        self._limit = RateLimiter(rpm)

    async def a_generate(self, *args, **kwargs):
        for attempt in range(RETRIES + 1):
            await self._limit.wait()
            try:
                return await super().a_generate(*args, **kwargs)
            except Exception as exc:
                if not is_busy(exc) or attempt == RETRIES:
                    raise
                await asyncio.sleep(WAIT_SECONDS)


def make_judge(model: str, api_key: str, rpm: float | None = None) -> GeminiModel:
    return ThrottledGemini(model=model, api_key=api_key, temperature=0, rpm=rpm)
