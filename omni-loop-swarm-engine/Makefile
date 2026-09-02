.PHONY: install backend frontend build test clean

install:
	python3 -m venv .venv
	. .venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install

backend:
	python3 app.py

frontend:
	cd frontend && npm run dev

build:
	cd frontend && npm run build

test:
	python3 -m pytest test_swarm.py -v

clean:
	rm -rf .venv frontend/node_modules frontend/dist __pycache__ *.pyc
