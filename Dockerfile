FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/package-lock.json ./packages/backend/
COPY packages/frontend/package.json packages/frontend/package-lock.json ./packages/frontend/

RUN npm ci --include=dev

COPY . .

ARG VITE_API_URL=/api/v1
ARG VITE_APP_TITLE="Club OS"
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_TITLE=${VITE_APP_TITLE}

RUN npm run build -w packages/frontend

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app /app
COPY --from=builder /app/packages/frontend/dist /app/packages/backend/public

# Install PostgreSQL client tools (pg_dump) for database backups
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*

RUN chmod +x /app/docker-entrypoint.sh \
  && mkdir -p /app/packages/backend/public /app/packages/backend/uploads /app/packages/backend/logs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 CMD node -e "const http=require('http');const port=Number(process.env.PORT||3000);const req=http.get({host:'127.0.0.1',port,path:'/health',timeout:4000},res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1);});"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "packages/backend/src/server.js"]
