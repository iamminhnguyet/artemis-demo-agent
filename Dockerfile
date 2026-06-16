FROM python:3.12-slim

WORKDIR /app

COPY . .

EXPOSE 8080

CMD ["python", "server.py"]
