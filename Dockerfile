FROM node:16

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first, for efficient caching
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Set the entrypoint to be the specific JavaScript file
ENTRYPOINT ["node", "dist/Projectdata.js"]
