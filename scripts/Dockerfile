# syntax=docker/dockerfile:1

FROM node:21.4-alpine3.19 AS builder

WORKDIR /app

# copy all modules into the workdir
COPY ./src /app/src/
COPY ./package.json ./package-lock.json ./tsconfig.json /app/
COPY ./modules/benchmark /app/modules/benchmark
COPY ./modules/cli /app/modules/cli
COPY ./modules/statistics /app/modules/statistics

# install and build all modules
RUN npm install && npm run build
RUN cd modules/benchmark && npm install && npm run build
RUN cd modules/cli && npm install && npm run build
RUN cd modules/statistics && npm install && npm run build


FROM node:21.4-alpine3.19 AS flowR

LABEL author="Florian Sihler" git="https://github.com/Code-Inspect/flowr"

WORKDIR /app

RUN apk add --no-cache R

COPY ./scripts/demo.R LICENSE /app/

# install all modules (not in dev mode this time!)
RUN npm install --omit=dev
RUN cd modules/benchmark && npm install --omit=dev
RUN cd modules/cli && npm install --omit=dev
RUN cd modules/statistics && npm install --omit=dev

COPY --from=builder /app/dist/src /app/dist
COPY --from=builder /app/modules/benchmark/dist/src /app/modules/benchmark/dist
COPY --from=builder /app/modules/cli/dist/src /app/modules/cli/dist
COPY --from=builder /app/modules/statistics/dist/src /app/modules/statistics/dist

RUN rm -rf /app/**/tsconfig.tsbuildinfo

ENTRYPOINT ["node", "/app/modules/cli/dist/flowr.js"]
