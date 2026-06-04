FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/package.json
COPY worker/package.json ./worker/package.json
RUN npm install --omit=dev
COPY shared ./shared
COPY worker ./worker

CMD ["npm", "run", "start", "--workspace", "worker"]

