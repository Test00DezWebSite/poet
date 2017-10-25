FROM poet-base

COPY ["./config/claims-to-db.json", "/etc/poet/claims-to-db.json"]

VOLUME /poet/src

CMD [ "npm", "run", "claims-to-db", "--", "-c", "/etc/poet/claims-to-db.json" ]
