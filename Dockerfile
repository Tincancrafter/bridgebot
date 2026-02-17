FROM node:18-alpine

WORKDIR /srv

ENV HOME=/srv
RUN mkdir -p /srv/.minecraft/nmp-cache

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY src ./src
COPY index.js ./

CMD ["yarn", "start"]
