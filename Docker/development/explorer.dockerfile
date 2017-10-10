FROM poet-base

COPY ["./node/config/explorer.json", "/etc/poet/explorer.json"]

VOLUME /poet/src
VOLUME /poet/dist

EXPOSE 4000
EXPOSE 5853

CMD [ "npm", "run", "explorer-api-debug", "--", "-c", "/etc/poet/explorer.json" ]
