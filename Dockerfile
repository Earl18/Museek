FROM node:18

WORKDIR /app

# Install system packages needed for native modules
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip build-essential && \
    apt-get clean

# Copy only package.json to install deps
COPY package*.json ./
RUN npm install

# Copy rest of your bot code
COPY . .

# If you're not using pip-based yt-dlp, skip this
# RUN pip3 install yt-dlp

CMD ["node", "bot.js"]
