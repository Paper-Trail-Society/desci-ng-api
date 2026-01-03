FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./

ENV NODE_ENV=production

RUN npm ci

COPY . .

EXPOSE $PORT

FROM base AS development

ENV NODE_ENV=development

RUN npm install --only=development

CMD ["npm", "run", "dev"]

FROM base AS production

USER node

COPY --chown=node:node . /app

RUN npm cache clean --force

CMD ["npm", "run", "start"]
