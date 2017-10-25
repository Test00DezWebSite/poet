FROM poet-base

COPY ["./config/explorer.json", "/etc/poet/explorer.json"]

VOLUME /poet/src

EXPOSE 4000

CMD [ "npm", "run", "explorer-api", "--", "-c", "/etc/poet/explorer.json" ]
