"""Create the MySQL database named in DATABASE_URL if it does not exist.

Usage (from backend/):  python -m scripts.init_db
Then create the tables:  alembic upgrade head
"""

import asyncio
import os

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import create_async_engine

load_dotenv()


async def main() -> None:
    raw = os.getenv("DATABASE_URL")
    if not raw:
        raise SystemExit("DATABASE_URL is not set (see backend/.env.sample).")

    url = make_url(raw)
    db_name = url.database
    if not db_name or not db_name.replace("_", "").isalnum():
        raise SystemExit(f"Unsafe or missing database name in DATABASE_URL: {db_name!r}")

    # Connect to the server without selecting a database.
    # (URL.set(database=None) is a no-op, so build the URL explicitly.)
    server_url = URL.create(
        drivername=url.drivername,
        username=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
        query=url.query,
    )
    engine = create_async_engine(server_url, isolation_level="AUTOCOMMIT")
    async with engine.connect() as conn:
        await conn.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )
    await engine.dispose()
    print(f"Database '{db_name}' is ready.")


if __name__ == "__main__":
    asyncio.run(main())
