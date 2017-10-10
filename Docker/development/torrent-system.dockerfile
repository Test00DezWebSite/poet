FROM poet-base

RUN apt-get update && apt-get install -y --no-install-recommends xvfb libgtk2.0-0 libxtst-dev libxss-dev libgconf2-dev libnss3 libasound2-dev

VOLUME /poet/src
VOLUME /poet/torrents
VOLUME /poet/dist

EXPOSE 5857

CMD [ "npm", "run", "torrent-system-debug" ]
