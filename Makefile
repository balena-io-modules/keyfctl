IMAGE=localhost/keyfctl:latest

build:
	docker build -t ${IMAGE} .

install:
	sudo cp bin/keyfctl /usr/local/bin/keyfctl && \
	sudo chmod +x /usr/local/bin/keyfctl

update:
	docker pull resin/keyfctl:master


