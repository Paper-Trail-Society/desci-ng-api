.PHONY: all build dev down logs ps restart up db-migrate db-generate

all: down build up logs

build:
	docker compose build

up:
	docker compose up -d

setup: build
	${MAKE} up
	docker exec -it desci-ng-api /bin/sh -c "npm run prepare:dev"

db-migrate:
	docker exec -it desci-ng-api /bin/sh -c "npm run db:migrate"

db-generate:
	docker exec -it desci-ng-api /bin/sh -c "npm run db:generate"

down:
	docker compose down

restart: down up

logs:
	docker compose logs api -f

ps:
	docker compose ps

test: setup
	docker compose exec api /bin/sh -c "npm run test"

help:
	@echo "Makefile targets:"
	@echo "  all         - Runs down, build, up, logs."
	@echo "  build       - Build docker containers."
	@echo "  up          - Start containers in background."
	@echo "  setup       - Build, up, and prepare development environment."
	@echo "  db-migrate  - Run database migrations inside container."
	@echo "  db-generate - Generate database client in container."
	@echo "  down        - Stop and remove containers."
	@echo "  restart     - Restart all containers."
	@echo "  logs        - Show logs for the API container."
	@echo "  ps          - Show status of containers."
	@echo "  help        - Show this help message."