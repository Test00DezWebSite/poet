FROM poet-base

VOLUME /poet/src
VOLUME /poet/dist

EXPOSE 7000
EXPOSE 5854

CMD [ "npm", "run", "mock-signer-debug" ]
