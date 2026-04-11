FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile  # быстрее и стабильнее чем npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]