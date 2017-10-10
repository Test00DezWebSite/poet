FROM poet-base

COPY ["./node/config/notifications.json", "/etc/poet/notifications.json"]

VOLUME /poet/src
VOLUME /poet/dist

EXPOSE 5500
EXPOSE 5855

CMD [ "npm", "run", "notifications-debug", "--", "-c", "/etc/poet/notifications.json" ]
