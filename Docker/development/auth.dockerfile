FROM poet-base

VOLUME /poet/src
VOLUME /poet/dist

EXPOSE 5000
EXPOSE 5850

CMD [ "npm", "run", "auth-server-debug" ]
