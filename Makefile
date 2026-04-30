# Root Makefile to run server/client from the top-level project directory
.PHONY: client install-node install-react-bootstrap install-react-router run-client server  build

client:
	make install-node && make install-react-bootstrap && make install-react-router && make run-client

install-node:
	cd App/client && npm install
# not  needed after build
install-react-bootstrap:
	cd App/client && npm install react-bootstrap bootstrap

install-react-router:
	cd App/client && npm install react-router-dom

run-client:
	cd App/client && npm start

server:
	cd App/Server/SearchEngine && python3 -m venv .venv && source .venv/bin/activate && python -m pip install --upgrade pip && pip install -r requirements.txt && uvicorn api:app --reload

build:
	cd App/client && npm run build