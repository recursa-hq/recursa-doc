# ---- Base Stage ----
# Use the official Bun image as a base.
# It includes all the necessary tooling.
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
# Install dependencies. This layer is cached to speed up subsequent builds
# if dependencies haven't changed.
FROM base as deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# ---- Build Stage ----
# Copy source code and build the application.
FROM base as build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# NOTE: If you were compiling to JS, a build step would go here.
# For Bun, we can run TS directly. We can also add a typecheck here.
RUN bun run typecheck

# ---- Production Stage ----
# Create a smaller final image.
# We only copy the necessary files to run the application.
FROM oven/bun:1-slim as production
WORKDIR /usr/src/app

# Copy production dependencies and source code
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/package.json ./package.json
COPY .env.example ./.env.example

# Expose the port the app runs on
EXPOSE 3000

# The command to run the application
CMD ["bun", "run", "src/server.ts"]