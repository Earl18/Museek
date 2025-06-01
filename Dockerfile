FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg curl

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "bot.js"]
