FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node demo ./demo
RUN mkdir data && chown node:node data
USER node
ENV HOST=0.0.0.0 PORT=3080
EXPOSE 3080
HEALTHCHECK --interval=30s CMD node -e "fetch('http://127.0.0.1:3080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "demo/server.mjs"]
