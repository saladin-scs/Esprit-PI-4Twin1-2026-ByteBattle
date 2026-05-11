# Kubernetes Guide

## Architecture

Namespace: `bytebattle-devops`

Workloads:

- `backend` deployment and service
- `frontend` deployment and service
- `mongodb` deployment and service
- `redis` deployment and service
- `rabbitmq` deployment and service
- `prometheus`, `grafana`, `alertmanager`, `kube-state-metrics`

Supporting resources:

- `ConfigMap`: `bytebattle-config`
- `Secret` template: `bytebattle-secrets`
- `Ingress`: `bytebattle-ingress`
- `HPA`: `backend-hpa`, `frontend-hpa`

## Apply Order

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

## Minikube

```bash
minikube start
minikube addons enable ingress
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
minikube service -n bytebattle-devops frontend-service
```

## Kind

```bash
kind create cluster --name bytebattle
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
```

## Image Placeholders

Replace:

- `registry/project-backend:REPLACE_WITH_COMMIT_SHA`
- `registry/project-frontend:REPLACE_WITH_COMMIT_SHA`

Or use `kubectl set image` after push:

```bash
kubectl -n bytebattle-devops set image deployment/backend backend=registry/project-backend:abc1234
kubectl -n bytebattle-devops set image deployment/frontend frontend=registry/project-frontend:abc1234
```

## Health Probes

- backend readiness: `/health/ready`
- backend liveness: `/health`
- frontend readiness/liveness: `/healthz`

## Security Context

Applied on app containers:

- `runAsNonRoot: true`
- `allowPrivilegeEscalation: false`
- dropped Linux capabilities

## Monitoring

Prometheus:

- service: `prometheus`
- scrapes backend `/metrics`
- includes alert rules from `prometheus-rules.yaml`

Grafana:

- service: `grafana`
- three provisioned dashboards from `grafana-dashboards-configmap.yaml`

Alertmanager:

- service: `alertmanager`
- webhook URL comes from `bytebattle-secrets`

## Open Services

```bash
kubectl -n bytebattle-devops port-forward svc/prometheus 9090:9090
kubectl -n bytebattle-devops port-forward svc/grafana 3000:3000
kubectl -n bytebattle-devops port-forward svc/alertmanager 9093:9093
```

## Test Alerts

To simulate a backend outage:

```bash
kubectl -n bytebattle-devops scale deployment/backend --replicas=0
```

To restore:

```bash
kubectl -n bytebattle-devops scale deployment/backend --replicas=2
```

## Rollback

```bash
kubectl -n bytebattle-devops rollout undo deployment/backend
kubectl -n bytebattle-devops rollout undo deployment/frontend
kubectl -n bytebattle-devops rollout status deployment/backend
kubectl -n bytebattle-devops rollout status deployment/frontend
```
