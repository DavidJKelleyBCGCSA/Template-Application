FROM node:12.6.0-alpine

RUN apk --no-cache add --virtual \
      builds-deps \
      build-base \
      python \
      git \
      curl

WORKDIR /usr/src/
COPY . .
EXPOSE 3000
RUN npm ci --production
CMD ["npm", "run", "start:dist"]