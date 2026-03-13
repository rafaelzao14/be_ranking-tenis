# Deploy na VPS com Docker + GitHub Actions (NestJS + TypeORM)

Este guia descreve o fluxo completo para deploy automatico em VPS ao fazer `push` na branch `main`.

## Arquitetura do deploy

1. `Docker Publish` roda no GitHub Actions quando ha push na `main`.
2. A imagem e publicada no GHCR com tag `main`.
3. `Deploy VPS` dispara apos `Docker Publish` com sucesso.
4. O job conecta na VPS via SSH e executa:
   - `git pull` no repositorio da VPS
   - `docker compose pull` da API
   - `docker compose up -d --remove-orphans`

## Arquivos envolvidos

- `.github/workflows/docker-publish.yml`
- `.github/workflows/deploy-vps.yml`
- `docker-compose.vps.yml`
- `Dockerfile`
- `scripts/deploy-vps.sh`

## 1) Preparar VPS (primeira vez)

```bash
sudo mkdir -p /opt/ranking-tenis
sudo chown -R $USER:$USER /opt/ranking-tenis
cd /opt/ranking-tenis
git clone <URL_DO_REPO> be_ranking-tenis
cd be_ranking-tenis
```

## 2) Configurar .env de producao

```bash
cp .env.example .env
nano .env
```

Exemplo de `.env` para este projeto:

```env
NODE_ENV=production
PORT=3333
CORS_ORIGIN=http://62.171.173.97:4201

DB_HOST=62.171.173.97
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=savaris2026!2026
DB_NAME=savarishomol
DB_SSL=false

JWT_SECRET=super-secret-para-savaris
JWT_REFRESH_SECRET=dev_jwt_refresh_secret

AUTH_USER=admin
AUTH_PASSWORD=admin123
AUTH_TOKEN_EXPIRES_IN_SECONDS=43200
```

Observacoes:
- O projeto usa **TypeORM** com variaveis `DB_*`.
- `DATABASE_URL` e opcional; se existir, ele tem prioridade.

## 3) Configurar rede Docker (se o banco estiver em container local)

```bash
docker network create savaris_backend || true
docker network connect savaris_backend postgres || true
```

`docker-compose.vps.yml` ja conecta a API nessa rede.

## 4) Login no GHCR na VPS (uma vez)

Se o pacote for privado:

```bash
docker login ghcr.io -u <github-user>
```

Use token com escopo `read:packages`.

## 5) Configurar secrets no GitHub

No repositorio: `Settings > Secrets and variables > Actions`

Criar:
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `GHCR_USER` (usuario GitHub com acesso de leitura ao pacote)
- `GHCR_TOKEN` (token com escopo `read:packages`)

## 6) Teste manual inicial na VPS

```bash
cd /opt/ranking-tenis/be_ranking-tenis
IMAGE=ghcr.io/<owner>/<repo>:main docker compose -f docker-compose.vps.yml up -d
```

## 7) Deploy automatico por push

```bash
git add .
git commit -m "chore: ajustar deploy"
git push origin main
```

## 8) Validacao pos deploy

Na VPS:

```bash
cd /opt/ranking-tenis/be_ranking-tenis
export IMAGE=ghcr.io/<owner>/<repo>:main

docker compose -f docker-compose.vps.yml ps
docker compose -f docker-compose.vps.yml logs --tail=200 api
curl -i http://localhost:3333/
```

Do seu computador:

```bash
curl -i http://62.171.173.97:3333/
curl -i http://62.171.173.97:3333/docs
```

## 9) Teste de autenticacao (cookie)

```bash
curl -i -c cookies.txt -X POST http://62.171.173.97:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

curl -i -b cookies.txt http://62.171.173.97:3333/auth/me
curl -i -b cookies.txt http://62.171.173.97:3333/players
```

## Troubleshooting rapido

### Erro `npm ci can only install packages when package.json and package-lock.json are in sync`

Rodar localmente e commitar lockfile:

```bash
npm install
git add package-lock.json package.json
git commit -m "chore: sync lockfile"
git push origin main
```

### Erro `password authentication failed for user "postgres"`

Credencial do `.env` nao bate com o Postgres real. Ajustar `DB_USER/DB_PASSWORD/DB_NAME` e recriar container:

```bash
export IMAGE=ghcr.io/<owner>/<repo>:main
docker compose -f docker-compose.vps.yml up -d --force-recreate
```

### API nao responde externamente, mas responde em localhost

Liberar porta no firewall da VPS (exemplo `ufw`):

```bash
ufw allow 3333/tcp
ufw status
```
