FROM golang:1.22-alpine AS build

WORKDIR /app

COPY go.mod ./
COPY . .

RUN go mod tidy
RUN go build -o /bin/cargotrans-server ./cmd/server

FROM alpine:3.20

WORKDIR /app

RUN adduser -D -u 10001 appuser

COPY --from=build /bin/cargotrans-server /usr/local/bin/cargotrans-server

USER appuser

EXPOSE 8080

CMD ["cargotrans-server"]
