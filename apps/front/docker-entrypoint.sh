#!/bin/sh
envsubst '${PORT} ${API_UPSTREAM}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf
nginx -g 'daemon off;'
