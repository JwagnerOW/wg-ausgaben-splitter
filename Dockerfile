FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json client/package-lock.json* ./client/
RUN npm install && cd client && npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist
RUN mkdir -p server/uploads
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
