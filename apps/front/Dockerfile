# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
# Eliminar config default de nginx
RUN rm -f /etc/nginx/conf.d/default.conf
# Copiar template y entrypoint
COPY nginx.railway.conf /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
# Copiar build de Angular
COPY --from=build /app/dist/front/browser /usr/share/nginx/html
ENV PORT=80
ENV API_UPSTREAM=http://api:3000
EXPOSE 80
CMD ["/docker-entrypoint.sh"]
