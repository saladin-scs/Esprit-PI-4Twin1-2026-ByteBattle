FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the compiled app
CMD ["node", "dist/main"]
