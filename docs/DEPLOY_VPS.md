# Deploy automatico na VPS (Docker)

Este projeto foi migrado para NestJS e esta configurado para deploy automatico na VPS ao fazer `push` na branch `main`.

## Resumo do fluxo

1. `Docker Publish` gera/publica a imagem no GHCR com a tag `main`.
2. `Deploy VPS` roda automaticamente quando o publish da `main` termina com sucesso.
3. O deploy conecta via SSH na VPS, atualiza o repositorio e executa:
   - `docker compose -f docker-compose.vps.yml pull api`
   - `docker compose -f docker-compose.vps.yml up -d --remove-orphans`

## Arquivos de deploy

- `.github/workflows/deploy-vps.yml`
- `docker-compose.vps.yml`
- `scripts/deploy-vps.sh`

## Pré-requisitos da VPS

- Docker e Docker Compose plugin instalados.
- Repositorio clonado em `/opt/ranking-tenis/be_ranking-tenis`.
- Banco Postgres rodando em container (no mesmo host).
- Rede Docker compartilhada `savaris_backend` para API e banco.

## Passo a passo completo

### 1) Clonar repositorio na VPS

```bash
sudo mkdir -p /opt/ranking-tenis
sudo chown -R $USER:$USER /opt/ranking-tenis
cd /opt/ranking-tenis
git clone <URL_DO_REPO> be_ranking-tenis
cd be_ranking-tenis
```

### 2) Configurar variaveis de ambiente

```bash
cp .env.example .env
nano .env
```

Campos obrigatorios para producao:

- `NODE_ENV=production`
- `DATABASE_URL` apontando para o banco correto
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `AUTH_USER`
- `AUTH_PASSWORD`

Exemplo com banco em container local chamado `postgres`:

```env
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/rank_tenis_hom?schema=public"
```

### 3) Garantir rede entre API e banco

```bash
docker network create savaris_backend || true
docker network connect savaris_backend postgres || true
```

Observacao:
- O `docker-compose.vps.yml` ja conecta a API na rede `savaris_backend`.
- Se o banco estiver em outro container/nome, troque `postgres` no comando acima e na `DATABASE_URL`.

### 4) Login no GHCR (uma vez)

Necessario se o pacote for privado:

```bash
docker login ghcr.io -u <github-user>
```

Use token com escopo `read:packages`.

### 5) Configurar secrets do GitHub Actions

Em `Settings > Secrets and variables > Actions`, criar:

- `VPS_HOST` (ex: `62.171.173.97`)
- `VPS_USER` (ex: `root`)
- `VPS_SSH_KEY` (chave privada da automacao)

### 6) Validar deploy manual (opcional)

```bash
cd /opt/ranking-tenis/be_ranking-tenis
IMAGE=ghcr.io/<owner>/<repo>:main docker compose -f docker-compose.vps.yml up -d
```

### 7) Deploy automatico via push

```bash
git add .
git commit -m "chore: migrate to nestjs and vps deploy"
git push origin main
```

## Validacao pos-deploy

```bash
cd /opt/ranking-tenis/be_ranking-tenis
export IMAGE=ghcr.io/<owner>/<repo>:main

docker compose -f docker-compose.vps.yml ps
docker compose -f docker-compose.vps.yml logs --tail=100 api
curl -i http://localhost:3333/
```

Swagger:

- `http://<VPS_HOST>:3333/docs`

## Deploy manual de fallback

```bash
cd /opt/ranking-tenis/be_ranking-tenis
IMAGE=ghcr.io/<owner>/<repo>:main ./scripts/deploy-vps.sh
```
