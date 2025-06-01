# Use a stable Node.js base image
FROM node:18

# Set the working directory
WORKDIR /app

# Install OS-level dependencies
# - ffmpeg: for audio
# - python3 & pip: for yt-dlp (optional)
# - build-essential: for native Node modules like @discordjs/opus
RUN apt-get update && \
    apt-get install -y \
        ffmpeg \
        python3 \
        python3-pip \
        build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency definitions first (allows Docker cache reuse)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# (Optional) Install yt-dlp via pip if your bot uses it directly
# You can remove this line if using `yt-dlp-exec` only
# RUN pip3 install yt-dlp

# Start the bot
CMD ["node", "bot.js"]
