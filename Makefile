# Root Makefile to run server/client from the top-level project directory
.PHONY: client install-node install-react-bootstrap install-react-router run-client server  build

client:
	cd App/client && docker compose up --build

server:
	cd App/server && docker compose up --build