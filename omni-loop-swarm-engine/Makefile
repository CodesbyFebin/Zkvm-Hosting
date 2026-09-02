.PHONY: install backend frontend build test clean docker-build docker-run

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
	python3 -m pytest test_swarm.py test_llm.py test_app.py -v

docker-build:
	docker build -t omni-loop-swarm-engine .

docker-run: docker-build
	docker run --rm -p 5000:5000 omni-loop-swarm-engine

clean:
	rm -rf .venv frontend/node_modules frontend/dist __pycache__ *.pyc .pytest_cache
