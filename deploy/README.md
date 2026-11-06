# iink v2 frontend — deploy

Same pipeline and same server scripts as the backend. Full runbook (AWS setup, secrets, diagnose, deploy, rollback): **iink_v2_bc → `deploy/README.md`**.

Frontend specifics:
- Built in CI with `NEXT_PUBLIC_API_BASE_URL=/api` and `BACKEND_INTERNAL_URL=http://127.0.0.1:4105` — the browser calls `/api/*` on iink.co.kr and Next.js forwards it to the backend on the same server. No backend port is public.
- Runs as systemd `iink-v2-ft` on `127.0.0.1:3105`, memory cap 600 MB, release folders in `/home/iink-v2/ft/`.
- GitHub secrets needed: only `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (environment `production`).
- Deployment group: `codedeploy-deployment-iink-v2-ft`.
- The files in `deploy/scripts/` and `deploy/systemd/` are identical to the backend repo — change both together.
