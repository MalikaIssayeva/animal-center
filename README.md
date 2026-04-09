---

````md
# Запуск проекта

## 1. Локальный запуск (без Docker)

### Backend

```bash
cd backend
go mod tidy
go run main.go
````

Backend будет доступен по адресу:

```
http://localhost:8080
```

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен по адресу:

```
http://localhost:5173
```

---

## 2. Запуск через Docker

Из корня проекта:

```bash
docker-compose up --build
```

Открыть в браузере:

```
http://localhost:5173
```

---

## Остановка контейнеров

```bash
docker-compose down
```

```

---


```
