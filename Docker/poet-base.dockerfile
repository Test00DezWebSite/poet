FROM poet-typescript

RUN mkdir -p /poet
WORKDIR /poet

COPY ./Docker/gitconfig /root/.gitconfig
COPY ./package.json /poet
COPY ./tsconfig.json /poet
RUN npm install

WORKDIR /poet
