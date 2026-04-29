FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Railway can pass this as build arg.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

RUN npm i -g serve

COPY --from=build /app/dist ./dist

ENV PORT=3000
EXPOSE 3000

CMD serve -s dist -l $PORT
