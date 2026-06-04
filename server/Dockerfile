FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json
RUN npm install --omit=dev
COPY shared ./shared
COPY server ./server
RUN mkdir -p /app/data

EXPOSE 4100
CMD ["npm", "run", "start", "--workspace", "server"]

