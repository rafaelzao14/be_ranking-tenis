# Migracao Express -> NestJS

## O que foi migrado

- Bootstrap da API para NestJS.
- Modulos separados por dominio:
  - `auth`
  - `players`
  - `challenges`
  - `matches`
  - `ranking`
  - `dashboard`
  - `health`
- TypeORM centralizado em `DatabaseModule`.
- Guard global JWT com cookie (`access_token`).
- Middleware global de log de request.
- Swagger em `/docs`.

## Endpoints mantidos

- `GET /`
- `GET /players`
- `GET /players/:id`
- `POST /players`
- `PATCH /players/:id`
- `PUT /players/:id`
- `GET /ranking/monthly?month=YYYY-MM`
- `GET /challenges`
- `POST /challenges`
- `DELETE /challenges/:id`
- `GET /matches`
- `POST /matches`
- `GET /dashboard/overview`

## Novos endpoints de autenticacao

- `POST /auth/login`
  - body: `{ "username": "...", "password": "..." }`
  - resposta: seta cookie `access_token` (httpOnly)
- `POST /auth/logout`
  - limpa cookie
- `GET /auth/me`
  - valida token/cookie atual

## Variaveis de ambiente novas

- `AUTH_USER`
- `AUTH_PASSWORD`
- `AUTH_TOKEN_EXPIRES_IN_SECONDS`
- `CORS_ORIGIN`

## Execucao local

```bash
npm install
npm run build
npm run dev
```

Acesse Swagger em `http://localhost:3333/docs`.
