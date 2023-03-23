FROM node:18-alpine

WORKDIR /app/src/

COPY --chown=node:node app .

RUN npm install

USER node

CMD ["npm", "run", "prod"]