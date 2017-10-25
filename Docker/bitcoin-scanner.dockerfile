FROM poet-base

COPY ["./config/bitcoin-scanner.json", "/etc/poet/bitcoin-scanner.json"]

VOLUME /poet/src

CMD [ "npm", "run", "bitcoin-scanner", "--", "-c", "/etc/poet/bitcoin-scanner.json" ]
