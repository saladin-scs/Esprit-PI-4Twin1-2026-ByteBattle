FROM node:20-bookworm
RUN apt-get update && apt-get install -y python3 g++ openjdk-17-jdk && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm run build && test -f dist/main.js

EXPOSE 3000

CMD ["node", "dist/main.js"]
