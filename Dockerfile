# Use an official Node runtime as a parent image
FROM node:20-bullseye-slim

# Puppeteer expects certain libraries. Install cron, Chromium and required packages.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libasound2 \
    libgbm1 \
    libx11-6 \
    libgtk-3-0 \
    chromium \
    cron \
    wget \
    unzip \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Ensure puppeteer downloads chromium (default behavior)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV NODE_ENV=production
# Prefer system-installed Chromium binary when available
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package manifests first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm ci --production

# Install pm2 globally so checker_blue.sh can control processes
RUN npm install -g pm2

# Copy application source
COPY . .

# Install web-control dependencies (web-control has its own package.json)
RUN cd web-control && npm install --production

# Ensure Puppeteer has a writable cache and download the expected Chrome build
ENV PUPPETEER_CACHE_DIR=/usr/src/app/.cache/puppeteer
RUN mkdir -p /usr/src/app/.cache/puppeteer && chmod -R 0777 /usr/src/app/.cache/puppeteer
# Force download Chromium that Puppeteer expects (pin to Puppeteer v24)
RUN npx puppeteer@24.6.1 install --product=chrome

# Ensure scripts are executable
RUN chmod +x ./checker_blue.sh || true
RUN chmod +x ./docker-entrypoint.sh || true

# Create logs directory
RUN mkdir -p /usr/src/app/logs

# Keep ownership for node but run as root in the container so cron can create pid files
RUN chown -R node:node /usr/src/app

# Expose if needed (web-control listens on 3003 in project; optional)
EXPOSE 3003

# Start entrypoint (this script will start cron and then run the main app)
ENTRYPOINT ["./docker-entrypoint.sh"]
