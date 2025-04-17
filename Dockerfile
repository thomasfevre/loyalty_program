# Base image with Node.js
FROM node:18-alpine as builder
WORKDIR /app
# Copy only package.json and lock file first to leverage Docker cache
COPY package*.json pnpm-lock.yaml* ./
# Install dependencies
RUN npm install
# Copy the rest of the application code
COPY . /app
# Build the application
RUN npm run build

# Production image
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app ./
CMD ["npm","run", "start"]