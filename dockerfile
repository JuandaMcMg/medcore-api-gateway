FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=builder /app ./
CMD ["npm", "run", "start"]