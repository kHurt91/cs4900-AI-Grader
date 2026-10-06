FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine

ENV PORT=8080
ENV BACKEND_URL=http://backend:8000
ENV NGINX_ENVSUBST_FILTER="^(PORT|BACKEND_URL|NGINX_RESOLVER)$"

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY 15-resolver.envsh /docker-entrypoint.d/15-resolver.envsh
RUN chmod +x /docker-entrypoint.d/15-resolver.envsh

EXPOSE 8080
