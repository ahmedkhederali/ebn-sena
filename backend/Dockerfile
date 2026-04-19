FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
RUN npm ci --workspace=backend --workspace=shared --ignore-scripts

# Build
COPY shared/ ./shared/
COPY backend/ ./backend/
RUN npm run build --workspace=shared
RUN npm run build --workspace=backend

# Production image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
RUN npm ci --workspace=backend --workspace=shared --omit=dev --ignore-scripts

COPY --from=base /app/shared/dist ./shared/dist
COPY --from=base /app/backend/dist ./backend/dist

EXPOSE 4000
CMD ["node", "backend/dist/server.js"]
