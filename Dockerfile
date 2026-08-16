FROM node:18-bookworm-slim AS builder

RUN corepack enable && corepack prepare yarn@4.18.0 --activate

WORKDIR /app

COPY .yarn ./.yarn
COPY .yarnrc.yml package.json yarn.lock ./
RUN yarn install --immutable

COPY . .
RUN yarn build

FROM node:18-bookworm-slim

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare yarn@4.18.0 --activate

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn

RUN yarn install --immutable --production

CMD ["node", "--env-file=.env", "dist/index.js"]
