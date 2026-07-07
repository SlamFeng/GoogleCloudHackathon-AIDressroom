#!/usr/bin/env bash
# One-shot Cloud Run deploy for Fashini. Requires gcloud auth + a GCP project.
#   ./scripts/deploy-cloudrun.sh <gcp-project-id> [region]
set -euo pipefail

PROJECT="${1:?Usage: deploy-cloudrun.sh <gcp-project-id> [region]}"
REGION="${2:-asia-northeast1}"
SERVICE="fashini"
IMAGE="gcr.io/${PROJECT}/${SERVICE}"

echo "› Building image ${IMAGE} via Cloud Build…"
gcloud builds submit --project "${PROJECT}" --tag "${IMAGE}"

echo "› Deploying ${SERVICE} to Cloud Run (${REGION})…"
gcloud run deploy "${SERVICE}" \
  --project "${PROJECT}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "INVENTORY_BACKEND=memory,VITE_ANALYSIS_MODE=auto" \
  --port 8080

echo "✓ Deployed. Service URL:"
gcloud run services describe "${SERVICE}" --project "${PROJECT}" --region "${REGION}" --format 'value(status.url)'
