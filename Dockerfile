FROM node:22

WORKDIR /srv

RUN mkdir -p /srv/.minecraft/nmp-cache
RUN mkdir -p /srv/.minecraft

COPY package.json package-lock.json ./
RUN npm install

COPY src ./src
COPY index.js ./

CMD ["npm", "start"]
