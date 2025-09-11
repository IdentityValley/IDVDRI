Deploy backend to Google Cloud Run

Prereqs
- Install Google Cloud SDK: https://cloud.google.com/sdk
- gcloud init
- Enable services:
  gcloud services enable run.googleapis.com artifactregistry.googleapis.com

Local test
- pip install -r backend/requirements.txt
- gunicorn backend.app:app -b 0.0.0.0:8080

Deploy without Dockerfile (source deploy)
- gcloud run deploy idv-backend \
    --source . \
    --region europe-west1 \
    --allow-unauthenticated \
    --port 8080 \
    --env-vars-file backend/env.yaml

Or set env vars inline
- gcloud run deploy idv-backend \
    --source . \
    --region europe-west1 \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars SUPABASE_URL=...,SUPABASE_ANON_KEY=...,OPENAI_API_KEY=...,CHAT_SYSTEM_PROMPT=...

Deploy with Dockerfile
- gcloud run deploy idv-backend \
    --source . \
    --region europe-west1 \
    --allow-unauthenticated

After deploy
- Visit https://<service-url>/api/health (supabase_configured should be true)
- In frontend/public/index.html add:
  <script>window.__API_BASE__ = 'https://<service-url>';</script>
- Or pass backendBaseUrl to FeedbackBot in React.


