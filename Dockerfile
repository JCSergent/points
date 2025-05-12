## STEP 1: Build ##
FROM node:23-alpine AS builder

WORKDIR /app/
COPY package*.json /app/

RUN npm ci --no-audit -quiet --no-progress --ignore-scripts

COPY ./ /app/ 

RUN npm run --quiet build


## STEP 2: Create Image ##
FROM nginxinc/nginx-unprivileged

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
