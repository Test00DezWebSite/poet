FROM poet-base

VOLUME /poet/src
VOLUME /poet/dist

CMD [ "npm", "run", "build:watch" ]
