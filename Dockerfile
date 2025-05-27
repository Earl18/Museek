# Use official Node alpine image
FROM node:20-alpine

# Install ffmpeg and build tools
RUN apk add --no-cache ffmpeg python3 make g++

# Set working directory
WORKDIR /app

# Copy files
COPY . .

# Install dependencies
RUN npm install

# Start bot
CMD ["npm", "start"]
