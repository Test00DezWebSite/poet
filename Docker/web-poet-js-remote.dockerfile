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

COPY ./web /web

RUN sed -i -E 's/ws\:\/\/localhost\:5000/wss\:\/\/auth.po.et/g' /web/src/configuration.ts
RUN sed -i -E 's/useMockSigner: true/useMockSigner: false/g' /web/src/configuration.ts

CMD [ "npm", "run", "start:prod" ]
