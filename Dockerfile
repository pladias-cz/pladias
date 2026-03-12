# Build frontend
FROM node:25 AS frontend_builder

WORKDIR /workspace/pladiasWeb/frontend

COPY pladiasWeb/frontend/package*.json ./
RUN npm ci

COPY pladiasWeb/frontend/ ./
RUN npm run build

# sbt dist
FROM ghcr.io/pladias-cz/sbt:v2 AS app_builder

USER root

WORKDIR /home/ubuntu

COPY ./pladiasWeb ./pladiasWeb
COPY --from=frontend_builder /workspace/pladiasWeb/public/react ./pladiasWeb/public/react

RUN chown -R ubuntu:ubuntu /home/ubuntu/pladiasWeb

USER ubuntu

WORKDIR /home/ubuntu/pladiasWeb

RUN sbt clean dist

# Copy items to final image
FROM eclipse-temurin:21-jre-noble

RUN apt-get update && \
    apt-get install -y --no-install-recommends unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=app_builder /home/ubuntu/pladiasWeb/target/universal/pladiasweb-1.0-SNAPSHOT.zip /home/ubuntu/app.zip

RUN unzip /home/ubuntu/app.zip -d /home/ubuntu/
RUN rm /home/ubuntu/pladiasweb-1.0-SNAPSHOT/bin/*.bat
RUN rm /home/ubuntu/app.zip
RUN mv /home/ubuntu/pladiasweb-1.0-SNAPSHOT /home/ubuntu/app

WORKDIR /home/ubuntu/app
RUN chown -R ubuntu:ubuntu /home/ubuntu/app

COPY --chown=ubuntu:ubuntu ./start.sh /home/ubuntu/app

USER ubuntu

EXPOSE 9000

CMD ["/home/ubuntu/app/start.sh"]
