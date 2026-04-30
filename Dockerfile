FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

# Copy package.json and install only production deps (express, http-proxy-middleware)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built static files and the express proxy server
COPY --from=build /app/dist ./dist
COPY server.js ./

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
