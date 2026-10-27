# Two ways to build this image, one runtime:
#
#   CI (publish-master.yml): the `prebuilt` target COPIES the bundle the build
#   job produced and the tests ran against, from a named build context:
#     docker build -f apps/seo-demo/Dockerfile --target prebuilt \
#       --build-context dist=dist/apps/seo-demo .
#   No npm install and no nx build inside Docker (that was ~92 s of a ~3.5 min
#   run), and the image is byte-for-byte the tested build.
#
#   Locally, from a clean checkout: the default (last) target builds from source.
#     docker build -f apps/seo-demo/Dockerfile -t seo-demo .
#     docker run -p 4201:80 seo-demo
#     Visit http://localhost:4201

# Static files served by nginx: seo-demo has no SSR.
FROM nginx:latest AS runtime
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/mintplayer-ng-seo"
EXPOSE 80

# CI: the build output from the `dist` build context (dist/apps/seo-demo),
# which holds nginx.conf as an asset.
FROM runtime AS prebuilt
COPY --from=dist . /usr/share/nginx/html
COPY --from=dist nginx.conf /etc/nginx/conf.d/default.conf

FROM node:24-slim AS builder
WORKDIR /usr/local/app
COPY ./ /usr/local/app/
RUN npm ci && npx nx build seo-demo --configuration=production

# Local: build from source, then serve the same way as `prebuilt`.
FROM runtime AS standalone
COPY --from=builder /usr/local/app/dist/apps/seo-demo /usr/share/nginx/html
COPY --from=builder /usr/local/app/dist/apps/seo-demo/nginx.conf /etc/nginx/conf.d/default.conf
