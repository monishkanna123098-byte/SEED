FROM node:20-alpine

WORKDIR /app

# openssl: required by Prisma query engine on Alpine (libssl dependency)
# python3/make/g++/vips-dev: required by Sharp native bindings
RUN apk add --no-cache openssl python3 make g++ vips-dev

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]
