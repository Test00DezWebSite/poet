FROM poet-base

COPY ["./node/config/bitcoin-scanner.json", "/etc/poet/bitcoin-scanner.json"]

VOLUME /poet/src
VOLUME /poet/dist

EXPOSE 5851

CMD [ "npm", "run", "bitcoin-scanner-debug", "--", "-c", "/etc/poet/bitcoin-scanner.json" ]
