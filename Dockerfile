FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_TWENTY_GRAPHQL_URL=/graphql
ARG VITE_GRAPHQL_API_URL=/graphql
ARG VITE_TWENTY_API_KEY=

ENV VITE_TWENTY_GRAPHQL_URL=$VITE_TWENTY_GRAPHQL_URL
ENV VITE_GRAPHQL_API_URL=$VITE_GRAPHQL_API_URL
ENV VITE_TWENTY_API_KEY=$VITE_TWENTY_API_KEY

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY frontend.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
