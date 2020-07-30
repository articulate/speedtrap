FROM node:14.4-stretch-slim
RUN yarn install --frozen-lockfile
CMD ["yarn", "test"]
