FROM node:14.4-stretch-slim
RUN apt-get update && apt-get install make
COPY . /app/
RUN cd ./app && yarn install --frozen-lockfile
CMD ["yarn", "test"]
