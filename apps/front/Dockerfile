# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
# Railway inyecta PORT; nginx:alpine procesa templates con envsubst
ENV PORT=80
COPY nginx.railway.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/front/browser /usr/share/nginx/html
EXPOSE 80
