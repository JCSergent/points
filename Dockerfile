## STEP 1: Build ##
FROM node:23-alpine AS builder

WORKDIR /app/
COPY package*.json /app/

RUN npm ci --no-audit -quiet --no-progress --ignore-scripts

COPY ./ /app/ 

RUN npm run --quiet build


## STEP 2: Create Image ##
FROM nginx:latest
COPY --from=builder /app/dist /usr/share/nginx/html
