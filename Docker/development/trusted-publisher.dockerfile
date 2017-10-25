FROM poet-base

COPY ["./config/trusted-publisher.json", "/etc/poet/trusted-publisher.json"]

VOLUME /poet/src
VOLUME /poet/dist

EXPOSE 6000
EXPOSE 5858

CMD [ "npm", "run", "trusted-publisher-debug", "--", "-c", "/etc/poet/trusted-publisher.json" ]
