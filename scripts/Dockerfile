# syntax=docker/dockerfile:1

FROM node:21.4-alpine3.19 AS builder

WORKDIR /app

COPY ./src /app/src/
COPY ./package.json ./package-lock.json ./tsconfig.json /app/

RUN npm install
RUN npm run build


FROM node:21.4-alpine3.19 AS flowR

LABEL author="Florian Sihler" git="https://github.com/Code-Inspect/flowr"

WORKDIR /app

RUN apk add --no-cache R

# we keep the package.json for module resolution
COPY ./package.json ./scripts/demo.R LICENSE /app/
RUN npm install --omit=dev

COPY --from=builder /app/dist/src /app/dist
RUN rm -rf /app/dist/tsconfig.tsbuildinfo

ENTRYPOINT ["node", "/app/dist/flowr.js"]
