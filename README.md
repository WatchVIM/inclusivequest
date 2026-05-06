# InclusiveQest Website

InclusiveQest is an accessibility-first streaming and podcast platform concept for deaf and hard-of-hearing audiences. This repo includes a launch-ready React/Vite website prototype with:

- Homepage with uploaded InclusiveQest logo
- Watch page with synced ASL sidecar video support
- Podcast library page
- Merch store page
- Creator submission page
- Captions/transcript/accessibility messaging
- Vercel deployment config

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL Vite provides, usually:

```bash
http://localhost:5173
```

## Test the repo data

```bash
npm run test
```

## Build for production

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Create a new GitHub repo, for example `inclusiveqest-web`.
2. Upload or push this project to GitHub.
3. Go to Vercel and choose **Add New Project**.
4. Import the GitHub repo.
5. Vercel should auto-detect Vite.
6. Confirm:
   - Build Command: `npm run build`
   - Output Directory: `dist`
7. Click **Deploy**.

## Logo

The company logo is stored here:

```text
public/inclusiveqest-logo.png
```

The app references it from:

```js
BRAND.logoSrc = '/inclusiveqest-logo.png'
```

## ASL Sidecar Video Setup

The demo uses the same public sample video for the main content and ASL sidecar. In production, each title should have separate files or Mux playback IDs:

```js
{
  title: 'Inclusive Voices',
  mainPlaybackId: 'MUX_MAIN_VIDEO_ID',
  aslPlaybackId: 'MUX_ASL_INTERPRETER_VIDEO_ID',
  captionsSrc: '/captions/inclusive-voices.vtt'
}
```

The synced sidecar behavior lives in:

```text
src/utils/useSyncedSidecar.js
```

It listens for play, pause, seek, playback-rate changes, waiting, and playing events on the main video, then keeps the ASL/interpreter video aligned.

## Mux Integration Notes

For the MVP, you can keep the website on Vercel and put all video assets in Mux. Do not upload large videos directly to Vercel.

Recommended production model:

- Main video: Mux asset
- ASL/interpreter sidecar: second Mux asset
- Captions: WebVTT or SRT
- Transcripts: HTML/Markdown page or database field
- Title metadata: Supabase, CMS, or static `content.js` until launch grows

When you install Mux Player later, the main video and ASL sidecar can be swapped from native `<video>` elements to Mux Player components.

## Merch Store Options

Fast launch options:

- Shopify Buy Button
- Shopify Starter
- Stripe Checkout
- Printful/Printify for print-on-demand fulfillment

The current merch page is a front-end mockup and does not process checkout yet.

## Suggested Next Features

- Real title CMS
- Supabase user accounts
- Mux signed playback for premium content
- Shopify or Stripe checkout
- Creator submission form
- Admin dashboard
- Transcript search
- Accessibility statement page
