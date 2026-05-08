FROM node:20-bookworm-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends python3 g++ openjdk-17-jdk ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS build

COPY . .
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm run build && test -f dist/main.js

FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends python3 g++ openjdk-17-jdk dumb-init ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN groupadd --system nodeapp && useradd --system --gid nodeapp --create-home --home-dir /home/nodeapp nodeapp && \
    mkdir -p /app/uploads && \
    chown -R nodeapp:nodeapp /app /home/nodeapp

ENV NODE_ENV=production
ENV PORT=3000

USER nodeapp

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
