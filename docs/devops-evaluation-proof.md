# DevOps Evaluation Proof

## 1. Architecture Summary

ByteBattle is delivered as a two-tier application on Kubernetes:

- frontend React application served by Nginx
- backend NestJS API with `/health`, `/health/ready`, and `/metrics`
- MongoDB for persistence
- Redis for cache/platform readiness
- RabbitMQ for messaging/platform readiness
- Prometheus + Grafana + Alertmanager for observability and alerting

CI/CD is available in both Jenkins and GitHub Actions.

## 2. Evaluation Grid Mapping

| Grid Item | Proof in Repository |
|---|---|
| Jenkins | `Jenkinsfile`, `Jenkinsfile.backend-ci`, `Jenkinsfile.frontend-ci`, `Jenkinsfile.backend-cd`, `Jenkinsfile.frontend-cd`, `Jenkinsfile.k8s-cd` |
| SonarQube | `backend/sonar-project.properties`, `frontend/sonar-project.properties` |
| Unit tests | `backend/src/health/health.controller.spec.ts`, `backend/src/battle/*.spec.ts`, `frontend/src/pages/Competitions/utils/competitionTiming.test.ts` |
| Docker | `backend/Dockerfile`, `frontend/Dockerfile`, `.dockerignore` files |
| Kubernetes | `k8s/*.yaml` |
| Grafana/Prometheus | `k8s/monitoring/*` |
| Alerting | `k8s/monitoring/prometheus-rules.yaml`, `k8s/monitoring/alertmanager-configmap.yaml` |
| Excellence | non-root containers, health probes, HPA, metrics endpoint, rollback instructions, secret placeholders |
| Theory | this file + `README.md` + `k8s/README.md` |

## 3. Safe Jenkins Demo

Use these root pipeline parameters:

```text
COMPONENT=all
RUN_TESTS=true
RUN_SONAR=false
BUILD_DOCKER=false
PUSH_DOCKER=false
DEPLOY_K8S=false
```

Explain:

- this proves CI safely without requiring external credentials
- then enable `BUILD_DOCKER`, `PUSH_DOCKER`, and `DEPLOY_K8S` for the full CD path after credentials are configured

## 4. Exact Commands for Jury Proof

### Backend

```bash
cd backend
npm ci
npm run lint:ci
npm run test:ci
npm run build
```

### Frontend

```bash
cd frontend
npm ci
npm run lint:ci
npm run test:ci
npm run build
```

### SonarQube

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts-community

cd backend
npx sonar-scanner -Dproject.settings=sonar-project.properties -Dsonar.host.url=http://localhost:9000 -Dsonar.token=YOUR_TOKEN

cd ../frontend
npx sonar-scanner -Dproject.settings=sonar-project.properties -Dsonar.host.url=http://localhost:9000 -Dsonar.token=YOUR_TOKEN
```

### Docker

```bash
docker build -t bytebattle-backend:local ./backend
docker build -t bytebattle-frontend:local --build-arg VITE_API_URL=/bb-api ./frontend
docker images | findstr bytebattle
```

### Kubernetes

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

kubectl get pods -n bytebattle-devops
kubectl get svc -n bytebattle-devops
kubectl get hpa -n bytebattle-devops
kubectl get ingress -n bytebattle-devops
```

### Metrics and Dashboards

```bash
kubectl -n bytebattle-devops port-forward svc/prometheus 9090:9090
kubectl -n bytebattle-devops port-forward svc/grafana 3000:3000
kubectl -n bytebattle-devops port-forward svc/alertmanager 9093:9093
```

### Alert Test

```bash
kubectl -n bytebattle-devops scale deployment/backend --replicas=0
kubectl -n bytebattle-devops get events --sort-by=.lastTimestamp
```

Then restore:

```bash
kubectl -n bytebattle-devops scale deployment/backend --replicas=2
```

## 5. Screenshot Checklist

- Jenkins successful parameterized build
- Jenkins backend CI and frontend CI job pages
- Jenkins backend CD, frontend CD, and k8s CD job pages
- SonarQube backend dashboard
- SonarQube frontend dashboard
- backend Jest coverage result
- frontend Vitest coverage result
- Docker images list
- Kubernetes pods/services/HPA/ingress
- Prometheus targets page
- Grafana dashboard 1: API health
- Grafana dashboard 2: pod resources
- Grafana dashboard 3: rollout health
- Alertmanager active alert or webhook receiver test

## 6. Short Theory Explanations

### CI vs CD

- CI validates code automatically after changes: install, lint, test, build, quality scan.
- CD takes validated artifacts and deploys them automatically or semi-automatically.

### Docker Build and Push

- `docker build` creates immutable images.
- `docker push` uploads those images to a registry so Kubernetes can pull them.

### Deployment, Service, Ingress, HPA

- Deployment manages replicated pods and rollout history.
- Service gives stable internal networking to pods.
- Ingress exposes HTTP routes from outside the cluster.
- HPA auto-scales replicas from metrics such as CPU and memory.

### ConfigMap vs Secret

- ConfigMap stores non-sensitive config such as ports, URLs, and feature flags.
- Secret stores sensitive values such as JWT secrets and webhook URLs.

### Readiness vs Liveness Probes

- readiness probe answers: can this pod receive traffic now?
- liveness probe answers: should Kubernetes restart this pod?

### Prometheus vs Grafana vs Alertmanager

- Prometheus scrapes and stores metrics.
- Grafana visualizes metrics in dashboards.
- Alertmanager routes alerts to receivers such as Slack, webhook, or email.

### Rollback Strategy

- Kubernetes Deployment keeps rollout history.
- `kubectl rollout undo deployment/<name>` restores the previous ReplicaSet.

## 7. Remaining Manual Actions

- create Jenkins jobs and map each one to the correct Jenkinsfile
- add Jenkins credentials
- replace secret placeholders in `k8s/secret.template.yaml`
- generate SonarQube token
- start Docker daemon before Docker build demo
- start Minikube or Kind before `kubectl apply`
- optionally point ingress hostname `bytebattle.local` to your cluster IP
- capture screenshots

## 8. Known Validation Notes

- backend lint/test/build passed locally
- frontend test/build passed locally
- frontend lint completed with warnings only, no errors
- Docker daemon was unavailable during this session, so Docker build commands were prepared but not executed successfully
- `kubectl` client is installed, but client-side dry-run still attempted to reach the unavailable local cluster OpenAPI endpoint
