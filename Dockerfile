# Use an official Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg

# Copy files
COPY . .

# Install build tools for native dependencies
RUN apk add --no-cache python3 make g++

# Install dependencies
RUN npm install

# Start bot
CMD ["npm", "start"]
