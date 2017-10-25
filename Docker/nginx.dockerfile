FROM nginx:1.13.0

COPY ["./Docker/nginx.conf", "/etc/nginx/nginx.conf"]

RUN rm /etc/nginx/conf.d/default.conf
