FROM node:18

WORKDIR /app

RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip build-essential && \
    apt-get clean

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "bot.js"]
