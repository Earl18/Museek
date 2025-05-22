# Use an official Node.js base image
FROM node:18

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the bot source code
COPY . .

# Optional: If using ES modules (e.g., "type": "module" in package.json)
# RUN npm install -g esm

# Default command
CMD ["node", "index.js"]
