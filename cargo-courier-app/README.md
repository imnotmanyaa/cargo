# Cargo Courier App

Отдельный frontend для курьеров с авторизацией через основной backend Cargo.

## Быстрый старт

- `npm install`
- `cp .env.example .env`
- `npm run dev`

## Переменные окружения

- `VITE_API_URL` - базовый URL backend, например `https://cargo.example.com`

## Текущий функционал

- Курьерский логин: `POST /api/auth/courier/login`
- Список задач: `GET /api/courier/tasks`
- Принять задачу: `POST /api/shipments/{id}/pickup-start`
- Подтвердить забор: `POST /api/shipments/{id}/pickup-confirm`

## Вынос в отдельный git-репозиторий

В директории `cargo-courier-app`:

- `git init`
- `git add -A`
- `git commit -m "Init Cargo Courier app"`
- `git branch -M main`
- `git remote add origin <your-new-repo-url>`
- `git push -u origin main`
