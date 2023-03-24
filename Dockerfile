
FROM node:18-slim

COPY --chown=node:node app /app

WORKDIR /app

RUN npm install

USER node

CMD ["npm", "run", "prod"]