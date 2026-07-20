# ui.apli.tech — landing page + hosted Storybook.
# Build for linux/amd64 (Lessly runs amd64; arm64 images fail with exec format error).
#   docker buildx build --platform linux/amd64 -t <img> --push .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build-storybook \
 && node site/build.mjs

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8080
# Only what the server serves: the built site, the built Storybook, and the server.
COPY --from=build /app/site/public ./site/public
COPY --from=build /app/storybook-static ./storybook-static
COPY --from=build /app/site/server.mjs ./site/server.mjs
EXPOSE 8080
USER node
CMD ["node", "site/server.mjs"]
