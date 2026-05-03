# my-worker-container

Cloudflare Workers + Containers demo for running `ttyd` in a container.

## Deploy

Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub Secrets before pushing to `main`.

The token must include account-level `Containers Write` permission. If the workflow fails with `403 Forbidden` on `/accounts/<id>/containers/me`, recreate the token with Containers access and try again.