FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY server ./server
RUN npm run build && mkdir -p /app/data && chown -R node:node /app/data
USER node
ENV HOST=0.0.0.0 PORT=3001 DATA_DIR=/app/data
EXPOSE 3001
CMD ["npm", "start"]
