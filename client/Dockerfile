FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json ./client/package.json
RUN npm install
COPY client ./client

EXPOSE 5174
CMD ["npm", "run", "dev", "--workspace", "client"]

