FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build && test -f dist/main.js

EXPOSE 3000

CMD ["node", "dist/main.js"]
