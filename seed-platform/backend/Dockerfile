FROM node:20-alpine

WORKDIR /app

# Install dependencies for Sharp (native bindings)
RUN apk add --no-cache python3 make g++ vips-dev

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]
