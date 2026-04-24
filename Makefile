# Root Makefile to run server/client from the top-level project directory
.PHONY: install-server install-client install server client build

install-server:
	cd App/server/API && npm install

install-client:
	cd App/client && npm install

# not  needed after deploy
install-react-bootstrap:
	cd App/client && npm install react-bootstrap bootstrap

install-react-router:
	npm install react-router-dom

install: install-server install-client

server:
	cd App/server/API && npm start

client:
	cd App/client && npm start

build:
	cd App/client && npm run build