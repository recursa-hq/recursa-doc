# ---- Base Stage ----
# Use an official Node.js image.
FROM node:20-slim as base
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
# Install dependencies. This layer is cached to speed up subsequent builds
# if dependencies haven't changed.
FROM base as deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build Stage ----
# Copy source code and build the application.
FROM base as build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Production Stage ----
# Create a smaller final image.
# We only copy the necessary files to run the application.
FROM node:20-slim as production
WORKDIR /usr/src/app

# Copy production dependencies and built source code
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json
COPY .env.example ./.env.example

# Expose the port the app runs on
EXPOSE 3000

# The command to run the application
CMD ["node", "dist/server.js"]