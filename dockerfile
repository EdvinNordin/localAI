FROM node:20

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Expose the backend port
EXPOSE 3000

# Start the Express server
CMD ["node", "server.js"]