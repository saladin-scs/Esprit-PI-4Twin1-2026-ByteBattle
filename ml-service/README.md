# ByteBattle ML Recommender Service

This service exposes a small FastAPI recommendation API while keeping the existing NestJS backend as the gateway.

## Purpose
- Serve the notebook-derived recommender as a lightweight Python microservice.
- Keep the NestJS backend as the API gateway and user-auth boundary.
- Avoid rebuilding the entire ML algorithm in NestJS.

## Run locally

1. Build the model artifacts:
   ```bash
   python save_artifacts.py --input-data path/to/user_ratings.csv --output-path ./models/recommender_artifacts.pkl
   ```

2. Start the service:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```

## Environment variables
- `ML_SERVICE_HOST` — default `0.0.0.0`
- `ML_SERVICE_PORT` — default `8001`
- `ML_MODEL_PATH` — default `./models/recommender_artifacts.pkl`
- `ALLOWED_ORIGINS` — comma-separated origins for CORS
- `ML_SERVICE_API_KEY` — optional API key header for backend-to-backend calls

## Deployment
- Use the provided `Dockerfile` to containerize the recommender.
- Mount `./models` into the container or bake artifacts into the image.

## Integration
- The NestJS backend is expected to call `POST /recommend` with `{ userId, limit }`.
- The backend exposes the authorized route `GET /recommendations/:userId`.
