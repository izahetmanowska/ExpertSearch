# Root Makefile to run server/client from the top-level project directory
.PHONY: install-server install-client install-react-bootstrap install-react-router install server client build

install-server:
	cd App/server/API && npm install

install-client:
	cd App/client && npm install

# not  needed after build
install-react-bootstrap:
	cd App/client && npm install react-bootstrap bootstrap

install-react-router:
	cd App/client && npm install react-router-dom

install: install-server install-client install-react-router install-react-bootstrap

server:
	cd App/server/API && npm start

client:
	cd App/client && npm start

build:
	cd App/client && npm run build