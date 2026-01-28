FROM node:18-bookworm-slim AS builder

# Enable Corepack and set Yarn version
RUN corepack enable && corepack prepare yarn@4.12.0 --activate

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY .yarn ./.yarn
COPY .yarnrc.yml package.json yarn.lock ./
RUN yarn install --immutable

# Copy and build the source code
COPY . .
RUN yarn build

# Execution stage
FROM node:18-bookworm-slim

ENV NODE_ENV=production

# Install necessary system packages and yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Enable Corepack and set Yarn version
RUN corepack enable && corepack prepare yarn@4.12.0 --activate

# Set working directory
WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn

# Install only production dependencies
RUN yarn install --immutable --production

#Use internal environment variable loader from Node 22
CMD ["node", "--env-file=.env", "dist/index.js"]