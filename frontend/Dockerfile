FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
<<<<<<< HEAD

RUN npm install --no-fund --no-audit
=======
RUN npm ci
>>>>>>> origin/saladin

COPY . .

ARG VITE_API_URL=/bb-api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
