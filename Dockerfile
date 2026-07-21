# Build frontend
FROM node:25 AS frontend_builder

WORKDIR /workspace/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# sbt dist
FROM ghcr.io/pladias-cz/sbt:v2 AS app_builder
USER ubuntu
WORKDIR /home/ubuntu

COPY  --chown=ubuntu:ubuntu . ./source
COPY  --chown=ubuntu:ubuntu --from=frontend_builder /workspace/public/react ./source/public/react

WORKDIR /home/ubuntu/source
RUN sbt clean dist

RUN unzip target/universal/pladiasweb-1.0-SNAPSHOT.zip -d /home/ubuntu/product && \
    rm /home/ubuntu/product/pladiasweb-1.0-SNAPSHOT/bin/*.bat && \
    mv /home/ubuntu/product/pladiasweb-1.0-SNAPSHOT /home/ubuntu/final

# Copy items to final image
FROM eclipse-temurin:21-jre-noble
USER ubuntu
WORKDIR /home/ubuntu

COPY --chown=ubuntu:ubuntu --from=app_builder /home/ubuntu/final app
COPY --chown=ubuntu:ubuntu ./start.sh app

EXPOSE 9000
CMD ["/home/ubuntu/app/start.sh"]
