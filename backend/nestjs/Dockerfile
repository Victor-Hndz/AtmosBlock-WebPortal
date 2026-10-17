FROM node:24-alpine

WORKDIR /app

# pnpm en la versión fijada en package.json (packageManager); corepack comprueba su hash
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE ${PORT}

CMD ["pnpm", "run", "start:prod"]
# CMD ["pnpm", "run", "start:dev"]
