FROM node:22.20.0-alpine AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci && npm cache clean --force

COPY . .

RUN npm run build

FROM node:22.20.0-alpine AS production

WORKDIR /app

COPY --from=base /app/.output /app/.output

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nuxt -u 1001

RUN chown -R nuxt:nodejs /app
USER nuxt

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", ".output/server/index.mjs"]