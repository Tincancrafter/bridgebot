FROM node:18-alpine

WORKDIR /srv

ENV HOME=/srv
RUN mkdir -p /srv/.minecraft/nmp-cache

COPY package.json yarn.lock ./
RUN npm install
RUN mkdir -p /srv/.minecraft
ENV HOME=/srv

COPY src ./src
COPY index.js ./

CMD ["npm", "start"]
