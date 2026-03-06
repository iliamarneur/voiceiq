# Stage 1: Build
FROM python:3.12-slim as build-env

WORKDIR /usr/src/app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Stage 2: Run
FROM python:3.12-slim

WORKDIR /usr/src/app

# Copy the necessary files from the build stage
COPY --from=build-env /usr/src/app .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app/main.py
ENV FLASK_RUN_HOST=0.0.0.0

# Expose port
EXPOSE 8000

# Set command to start the application
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]