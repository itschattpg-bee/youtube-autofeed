# AutoFeed v2

Android-focused YouTube feed.

### Quota-safe version
The original version used YouTube `search.list`, which costs **100 quota units per request**. This version uses the channel's **Uploads playlist + playlistItems.list**, which costs only **1 unit per API request**, and caches feed results for 5 minutes.

Features:
- Saved multiple channels
- Home feed combines all channels
- Individual channel category chips
- Video search
- Latest 30 days
- YouTube embedded player
- LocalStorage remembers channels/settings
- 5-minute server cache to avoid unnecessary API calls

Run:
1. `npm install`
2. Copy `.env.example` to `.env`
3. Put your YouTube Data API v3 key in `.env`
4. `npm start`
5. Open http://localhost:3000

If Google has already exhausted the quota for your current project, the quota will need to reset before API requests work again. The updated code prevents the expensive 100-unit search requests from being used.
