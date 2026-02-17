# InclusiveQuest (Scratch Build - YouTube Only)

This version intentionally removes ALL Next.js Route Handlers (`app/api/...`) to avoid Next.js 15 route typing build errors.

## What it does
- Home page
- Channels feed (server-rendered) from YouTube Data API
- Watch page: YouTube player + stationary ASL avatar panel on the LEFT (desktop) / BELOW (mobile)
- ASL track mapping: videoId -> ASL MP4 URL (hosted by you)

## Setup
1) Copy `.env.example` to `.env.local`
2) Add `YOUTUBE_API_KEY` (YouTube Data API v3)
3) `npm i`
4) `npm run dev`

## Deploy (Vercel)
- Import repo in Vercel
- Add env var: `YOUTUBE_API_KEY`
- Deploy

## Configure your channels
Edit `lib/channels.ts` with your channel IDs (UC...)

## Add ASL tracks
Edit `lib/asl-map.ts`:
`"VIDEO_ID": { aslUrl: "https://cdn.../VIDEO_ID.mp4" }`
