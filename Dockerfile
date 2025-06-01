FROM node:18-alpine

WORKDIR /app

# Install system dependencies needed for yt-dlp, ffmpeg
RUN apk add --no-cache ffmpeg python3 py3-pip curl

COPY package*.json ./
RUN npm install

COPY . .

# Install yt-dlp for latest fixes (needed for best YouTube compatibility)
RUN pip3 install yt-dlp

CMD ["node", "bot.js"]
