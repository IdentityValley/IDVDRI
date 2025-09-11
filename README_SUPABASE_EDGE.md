Supabase Edge Function: feedback-bot

Setup
1) Install CLI: https://supabase.com/docs/guides/cli
2) Login and link:
   supabase login
   supabase link --project-ref pyvcwxkqtqmqwykayrto

Secrets
3) Set secrets (never commit keys). Note: names cannot start with SUPABASE_. Use:
   supabase secrets set \
     OPENAI_API_KEY=YOUR_KEY \
     CHAT_SYSTEM_PROMPT="You are a friendly, concise assistant..." \
     CHAT_TEMPERATURE=0.2 CHAT_MAX_TOKENS=256 CHAT_MODEL=gpt-4o-mini \
     PROJECT_URL=https://pyvcwxkqtqmqwykayrto.supabase.co \
     SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

Deploy
4) Deploy function:
   supabase functions deploy feedback-bot

Invoke URLs
- POST https://pyvcwxkqtqmqwykayrto.supabase.co/functions/v1/feedback-bot/chat
- POST https://pyvcwxkqtqmqwykayrto.supabase.co/functions/v1/feedback-bot/feedback

Frontend config
- Set your site to call the above URLs (replace backendBaseUrl with the function base URL). The function handles both chat and saving feedback; no OpenAI key in the browser.


