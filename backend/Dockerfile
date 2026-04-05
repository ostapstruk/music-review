FROM python:3.12-slim

WORKDIR /app

# Системні залежності
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Залежності Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Додаємо бібліотеку для метрик Prometheus
RUN pip install --no-cache-dir prometheus-fastapi-instrumentator

# Копіюємо код
COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]