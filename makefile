development: base-images
	cd Docker && cp docker-compose.development.yml docker-compose.yml
	cd Docker && docker-compose build
	cd Docker && docker-compose run compile

production: base-images
	cd Docker && cp docker-compose.production.yml docker-compose.yml
	cd Docker && docker-compose build

poet-js:
	cd Docker && cp docker-compose.development.yml docker-compose.yml
	cd Docker && docker-compose -f docker-compose.yml -f docker-compose.poet-js.yml build

poet-js-only:
	cd Docker && cp docker-compose.development.yml docker-compose.yml
	cd Docker && docker-compose -f docker-compose.yml -f docker-compose.poet-js.yml build web

base-images: prepare
	docker build -f Docker/poet-typescript.dockerfile --tag poet-typescript:latest .
	docker build --file Docker/poet-base.dockerfile --tag poet-base:latest .

prepare:
	mkdir -p node/torrents
	mkdir -p node/dist
	mkdir -p Docker/postgres

start: prepare
	cd Docker && docker-compose up

stop:
	cd Docker && docker-compose stop

down:
	cd Docker && docker-compose down

compile:
	cd Docker && docker-compose run compile

daemon: prepare
	cd Docker && docker-compose start rabbitmq && sleep 2 && docker-compose up -d

psql:
	cd Docker && docker-compose exec db /usr/bin/psql -U poet

bash-web:
	cd Docker && docker-compose exec web /bin/bash

bash-explorer:
	cd Docker && docker-compose exec explorer /bin/bash

setup-cron:
	{ crontab -l; echo "*/5 * * * * export PATH=$PATH:/usr/loval/bin && cd /home/ubuntu/poet && /usr/bin/bash ./utils/fetch_and_reload.sh >> /dev/null" } | crontab -
