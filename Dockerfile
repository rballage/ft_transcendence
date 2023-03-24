
FROM node:19-slim

WORKDIR /app/

COPY --chown=node:node app .

RUN npm install

USER node

CMD ["npm", "run", "prod"]