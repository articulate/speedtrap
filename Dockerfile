FROM articulate/articulate-node:14-buster-slim

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile
