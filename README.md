# ByteBattle

Real-time collaborative coding challenge platform with a DevOps evaluation-ready delivery stack.

## DevOps Summary

- Jenkins:
  `Jenkinsfile` root pipeline is declarative and parameterized.
  Dedicated pipelines are also provided: `Jenkinsfile.backend-ci`, `Jenkinsfile.frontend-ci`, `Jenkinsfile.backend-cd`, `Jenkinsfile.frontend-cd`, `Jenkinsfile.k8s-cd`.
- SonarQube:
  Separate project configs in `backend/sonar-project.properties` and `frontend/sonar-project.properties`.
- Tests:
  Backend Jest coverage and frontend Vitest coverage run in CI.
- Docker:
  Backend and frontend production-friendly Dockerfiles with `.dockerignore` files.
- Kubernetes:
  Full `k8s/` stack with namespace, ConfigMap, Secret template, backend, frontend, MongoDB, Redis, RabbitMQ, ingress, and HPA.
- Observability:
  Prometheus, Grafana, Alertmanager, dashboards, and alert rules under `k8s/monitoring/`.

## Initial Audit

| Criterion | Current Status | Missing Work Implemented | Files Created/Updated |
|---|---|---|---|
| Backend folder | Present in `backend/` | Added metrics-ready health/test/CI support | `backend/package.json`, `backend/src/health/*`, `backend/sonar-project.properties` |
| Frontend folder | Present in `frontend/` | Added real tests, production runtime handling, CI support | `frontend/package.json`, `frontend/vite.config.ts`, `frontend/src/config/publicEnv.ts`, `frontend/sonar-project.properties` |
| Package manager | `npm` with lockfiles | Lockfiles refreshed for new DevOps deps | `backend/package-lock.json`, `frontend/package-lock.json` |
| Existing tests | Backend had 2 tests, frontend had none | Added backend health tests and frontend utility smoke tests | `backend/src/health/health.controller.spec.ts`, `frontend/src/pages/Competitions/utils/competitionTiming.test.ts` |
| Existing Dockerfiles | Present but dev-oriented / incomplete | Reworked for production and non-root where feasible | `backend/Dockerfile`, `frontend/Dockerfile`, `.dockerignore` files |
| Existing CI/CD | Partial Jenkinsfiles and placeholder GitHub Actions | Replaced with full CI/CD layout | `Jenkinsfile*`, `.github/workflows/*.yml` |
| Existing DB/cache services | Mongo only | Added cache, messaging, monitoring manifests | `k8s/mongodb.yaml`, `k8s/redis.yaml`, `k8s/rabbitmq.yaml`, `k8s/monitoring/*` |
| Existing env files | Root and frontend examples existed | Added K8s ConfigMap/Secret template and documented runtime values | `k8s/configmap.yaml`, `k8s/secret.template.yaml` |

## Repository Structure

```text
backend/                  NestJS backend
frontend/                 React + Vite frontend
.github/workflows/        GitHub Actions CI/CD
Jenkinsfile*              Jenkins pipelines
k8s/                      Kubernetes manifests
k8s/monitoring/           Prometheus, Grafana, Alertmanager, dashboards, alerts
docker-compose.yml        Local database compose
docker-compose.prod.yml   Local production-like stack
docs/devops-evaluation-proof.md
```

## Jenkins

### Root Pipeline

Use the root `Jenkinsfile` for the main evaluation demo.

Safe demo parameters:

```text
COMPONENT=all
RUN_TESTS=true
RUN_SONAR=false
BUILD_DOCKER=false
PUSH_DOCKER=false
DEPLOY_K8S=false
```

Parameters supported:

- `COMPONENT=backend|frontend|all`
- `RUN_TESTS=true|false`
- `RUN_SONAR=true|false`
- `BUILD_DOCKER=true|false`
- `PUSH_DOCKER=true|false`
- `DEPLOY_K8S=true|false`

Required Jenkins credentials placeholders:

- `dockerhub-username`
- `dockerhub-token`
- `sonar-token`
- `kubeconfig`
- application secrets through Kubernetes Secret manifest or Jenkins secret injection

### Dedicated Pipelines

- Frontend CI: `Jenkinsfile.frontend-ci`
- Backend CI: `Jenkinsfile.backend-ci`
- Frontend CD: `Jenkinsfile.frontend-cd`
- Backend CD: `Jenkinsfile.backend-cd`
- Kubernetes CD: `Jenkinsfile.k8s-cd`

CI to CD chaining:

- `Jenkinsfile.backend-ci` triggers `backend-cd`
- `Jenkinsfile.frontend-ci` triggers `frontend-cd`
- webhook trigger is provided through `githubPush()` on CI jobs
- manual trigger is available via Jenkins "Build with Parameters"

## GitHub Actions

Provided workflows:

- `ci-backend.yml`
- `ci-frontend.yml`
- `cd-backend.yml`
- `cd-frontend.yml`

These workflows:

- install dependencies
- lint
- run tests with coverage
- build applications
- optionally run SonarQube scan when `SONAR_TOKEN` and `SONAR_HOST_URL` are configured
- build and optionally push Docker images
- optionally deploy to Kubernetes when `KUBECONFIG` is configured

## Tests

### Backend

Validated locally:

```bash
cd backend
npm ci
npm run lint:ci
npm run test:ci
npm run build
```

### Frontend

Validated locally:

```bash
cd frontend
npm ci
npm run lint:ci
npm run test:ci
npm run build
```

Notes:

- frontend lint currently passes with warnings only
- backend CI lint uses `backend/.eslintrc.ci.js` to avoid failing on inherited repo-wide Prettier line-ending debt while still catching real lint errors

## Docker

### Build Commands

```bash
docker build -t bytebattle-backend:local ./backend
docker build -t bytebattle-frontend:local --build-arg VITE_API_URL=/bb-api ./frontend
```

### What Changed

- backend uses a multi-stage image and runs as non-root
- frontend uses a multi-stage Vite build and serves through unprivileged Nginx
- frontend reverse proxies `/bb-api`, `/socket.io`, `/api`, `/health`, and `/metrics` to the backend service

Note:

- Docker CLI is installed on this machine, but the Docker daemon was not running during validation, so image build commands could not complete end-to-end here

## SonarQube

### Local SonarQube

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts-community
```

Open `http://localhost:9000`, log in, and generate a token.

### Backend Scan

```bash
cd backend
npx sonar-scanner -Dproject.settings=sonar-project.properties -Dsonar.host.url=http://localhost:9000 -Dsonar.token=YOUR_TOKEN
```

### Frontend Scan

```bash
cd frontend
npx sonar-scanner -Dproject.settings=sonar-project.properties -Dsonar.host.url=http://localhost:9000 -Dsonar.token=YOUR_TOKEN
```

Coverage inputs:

- backend: `backend/coverage/lcov.info`
- frontend: `frontend/coverage/lcov.info`

## Kubernetes

See `k8s/README.md` for full deployment instructions.

Quick start with Minikube or Kind:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.template.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -k k8s/monitoring
```

## Monitoring and Alerting

Artifacts provided under `k8s/monitoring/`:

- Prometheus scrape config
- Prometheus alert rules
- Alertmanager config template
- Grafana provisioning and dashboards
- Prometheus/Grafana Helm values examples

Backend metrics endpoint:

- `GET /metrics`

Dashboards included:

- API health
- Pod resources
- Rollout health

## Jury Proof Checklist

Use `docs/devops-evaluation-proof.md` during the demo. It includes:

- Jenkins success screenshots
- SonarQube dashboard screenshots
- test reports
- Docker image proof
- Kubernetes pods/services/HPA proof
- Grafana dashboards
- Prometheus alerts
- Alertmanager/webhook proof
- theory reminders for CI/CD, Docker, Kubernetes, ConfigMap vs Secret, probes, Prometheus/Grafana/Alertmanager, and rollback

## Validation Status

Validated successfully on this machine:

- backend `npm ci`
- backend `npm run lint:ci`
- backend `npm run test:ci`
- backend `npm run build`
- frontend `npm ci`
- frontend `npm run lint:ci` with warnings only
- frontend `npm run test:ci`
- frontend `npm run build`

Not fully validated here:

- Docker image builds, because Docker daemon was not running
- `kubectl apply --dry-run=client`, because local cluster API/OpenAPI endpoint was unavailable

## Remaining Manual Actions

- Create Jenkins jobs that point to the provided Jenkinsfiles
- Add Jenkins credentials
- Generate SonarQube token
- Start Docker daemon before Docker build/push demo
- Start Minikube or Kind and apply manifests
- Replace placeholder secret values in `k8s/secret.template.yaml`
- Take screenshots for the jury
