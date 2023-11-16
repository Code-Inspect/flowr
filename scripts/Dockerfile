# syntax=docker/dockerfile:1

FROM node:20 AS builder

WORKDIR /app

COPY ../src /app/src/
COPY ./package*.json ./tsconfig.json /app/

RUN npm install
RUN npm run build


FROM node:20.8-alpine3.17 AS extractor

WORKDIR /app

RUN apk add --no-cache R
# install the xmlparsedata package because we need it
RUN Rscript -e "install.packages('xmlparsedata',repos='https://cloud.r-project.org/')"

# we keep the package.json for module resolution
COPY ../package.json LICENSE /app/
RUN npm install --omit=dev

COPY --from=builder /app/dist/src /app/dist
RUN rm -rf /app/dist/tsconfig.tsbuildinfo

ENTRYPOINT ["node", "/app/dist/extractor.js"]
