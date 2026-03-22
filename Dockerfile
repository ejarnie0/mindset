# Socket.IO game server — e.g. Railway “Deploy from Dockerfile” (Vercel only hosts Next.js)
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY server ./server
COPY data ./data
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server/index.js"]
