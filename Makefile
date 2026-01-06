.PHONY: all build dev down logs ps restart up

all: down build up logs

build:
	docker compose build

up:
	docker compose up -d

setup: build
	${MAKE} up
	docker exec -it desci-ng-api /bin/sh -c "npm run prepare:dev"


down:
	docker compose down

restart: down up

logs:
	docker compose logs api -f

ps:
	docker compose ps
