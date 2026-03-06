# Stage 1: Build the backend application
FROM python:3.12-slim as builder

WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN pip install --no-cache-dir -e .

# Stage 2: Run the backend application
FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /app /app

ENV PYTHONPATH=/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]