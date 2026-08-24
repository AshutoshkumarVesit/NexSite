# Build Stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production Stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

EXPOSE 3001
CMD ["npm", "start"]
