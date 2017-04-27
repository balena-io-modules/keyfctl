FROM library/node:7

RUN mkdir /usr/local/src/app
WORKDIR /usr/local/src/app
COPY package.json .
RUN npm install

COPY . .

ENTRYPOINT ["/usr/local/src/app/bin/keyfctl"]
WORKDIR /mnt/keyframe

