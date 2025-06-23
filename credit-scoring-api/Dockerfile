# Use Node.js 18 Alpine Linux as base image (lightweight)
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first (for better Docker layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose port 8080 (Google Cloud Run expects this port)
EXPOSE 8080

# Set the PORT environment variable (Cloud Run will override this)
ENV PORT=8080

# Start the application
CMD ["npm", "start"]