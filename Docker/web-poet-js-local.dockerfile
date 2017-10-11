FROM poet-typescript

RUN mkdir -p /web
WORKDIR /web

COPY ./Docker/gitconfig /root/.gitconfig
COPY ./web/package.json /web
COPY ./web/tsconfig.json /web
COPY ./web/webpack.config.js /web
COPY ./web/devServer.js /web
COPY ./web/_redirects /web

RUN npm i

CMD [ "npm", "start" ]
