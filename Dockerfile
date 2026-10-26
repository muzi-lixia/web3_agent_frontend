FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# These VITE values are public browser configuration, NEVER model/API secrets.
ARG VITE_REOWN_PROJECT_ID
ENV VITE_REOWN_PROJECT_ID=$VITE_REOWN_PROJECT_ID VITE_USE_MOCK=false VITE_API_BASE_URL=""
RUN test -n "$VITE_REOWN_PROJECT_ID" && npm run build

FROM nginx:stable-alpine AS runtime
COPY deployment/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
