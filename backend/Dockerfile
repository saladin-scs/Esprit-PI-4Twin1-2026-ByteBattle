
FROM node:18-alpine

WORKDIR /app

# Copier TOUT le dossier (pas de sélection spécifique)
COPY . .

# Installer les dépendances
RUN npm install

# Build
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
