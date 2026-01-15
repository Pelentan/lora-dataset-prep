FROM node:18-alpine AS frontend-builder

WORKDIR /app/web

COPY web/package*.json ./
RUN npm install

COPY web/ ./
RUN npm run build

FROM golang:1.21-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

COPY . .

RUN go mod tidy
RUN CGO_ENABLED=1 GOOS=linux go build -o lora-prep ./cmd/server

FROM alpine:latest

RUN apk --no-cache add ca-certificates sqlite

WORKDIR /app

COPY --from=backend-builder /app/lora-prep .
COPY --from=backend-builder /app/internal/db/migrations ./internal/db/migrations
COPY --from=frontend-builder /app/web/dist ./web/dist

ENV WEB_DIR=/app/web/dist

EXPOSE 8080

CMD ["./lora-prep"]