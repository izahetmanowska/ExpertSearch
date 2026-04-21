# Root Makefile to run server/client from the top-level project directory
.PHONY: install-server install-client install server client build

install-server:
	cd App/server/API && npm install

install-client:
	cd App/client && npm install

install: install-server install-client

server:
	cd App/server/API && npm start

client:
	cd App/client && npm start

build:
	cd App/client && npm run build