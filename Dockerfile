FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip build-essential ffmpeg curl && \
    pip3 install yt-dlp && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

CMD ["node", "bot.js"]
