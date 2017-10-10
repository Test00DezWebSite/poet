FROM poet-base

COPY ["./node/config/claims-to-db.json", "/etc/poet/claims-to-db.json"]

VOLUME /poet/src
VOLUME /poet/dist

EXPOSE 5852

CMD [ "npm", "run", "claims-to-db-debug", "--", "-c", "/etc/poet/claims-to-db.json" ]
