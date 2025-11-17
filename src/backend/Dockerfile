FROM ghcr.io/astral-sh/uv:python3.13-bookworm

WORKDIR /app

COPY . .
RUN uv sync

ENV PATH="/app/.venv/bin:$PATH"

# RUN apt update && apt install build-essential

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
