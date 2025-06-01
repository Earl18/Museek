FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-venv build-essential ffmpeg curl && \
    python3 -m venv /opt/yt-dlp-env && \
    /opt/yt-dlp-env/bin/pip install yt-dlp && \
    ln -s /opt/yt-dlp-env/bin/yt-dlp /usr/local/bin/yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

CMD ["node", "bot.js"]
