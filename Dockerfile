FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY nest-cli.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 3333

CMD ["npm", "run", "start:docker"]
