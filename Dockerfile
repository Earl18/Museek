# Use Node 18 base image with Debian (for better compatibility with native modules)
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies: Python (for yt-dlp-exec) and build tools (for native modules)
RUN apt-get update && \
    apt-get install -y python3 build-essential ffmpeg && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json and lockfile separately for better caching
COPY package*.json ./

# Install node dependencies
RUN npm ci --omit=dev

# Copy the rest of your project files
COPY . .

# Set the default command
CMD ["node", "bot.js"]
