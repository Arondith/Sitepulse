FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package*.json tsconfig.json ./
RUN npm ci
COPY web ./web
RUN npm run build
FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY web/index.html web/style.css /usr/share/nginx/html/
COPY --from=build /app/web/dist/app.js /usr/share/nginx/html/app.js
