FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./

RUN npm ci

FROM base AS development
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

RUN npm prune --production

FROM node:22-alpine AS production
WORKDIR /app


# Ensure user 'node' can write to the uploads directory for file uploads
RUN mkdir uploads && chown -R node:node uploads

ENV NODE_ENV=production

USER node

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/src/email-templates ./dist/email-templates

EXPOSE $PORT

CMD ["npm", "run", "start"]
