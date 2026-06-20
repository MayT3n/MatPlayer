# Mat Player — Cloudflare Worker Backend

این Worker مستقیماً صفحهٔ نتایج/تماشای **یوتیوب** را می‌خواند و خروجی تمیز و نرمال‌شده می‌دهد.
(نسخهٔ قبلی به Piped وابسته بود که instanceهای عمومی‌اش از کار افتاده‌اند؛ این نسخه بدون API key و پایدار است.)

## دیپلوی سریع

1. به [dash.cloudflare.com](https://dash.cloudflare.com) برو
2. **Workers & Pages** → **Create Worker**
3. یک اسم بده (مثلاً `mat-player-api`) و **Deploy** بزن
4. **Edit code** → محتوای `index.js` را paste کن → **Save and deploy**
5. URL را در `src/config/api.ts` بگذار:

```ts
export const API_BASE_URL = "https://mat-player-api.YOUR_NAME.workers.dev";
```

## Endpoints

- `GET /search?q=...` → `{ items: [{ id, title, artist, thumbnail, duration, views }] }`
- `GET /streams/:id` → `{ title, uploader, thumbnailUrl, duration, related: [...] }` (related = پلی‌لیست خودکار بر اساس خوانندهٔ آهنگ)
- `GET /meta/:id` → متادیتای سبک `{ title, author, lengthSeconds, thumbnail }`
- `GET /health`

## نکته‌ها

- پخش در مرورگر از طریق **YouTube IFrame API** انجام می‌شود (نیازی به stream URL نیست).
- ویوها و مدت‌زمان‌ها **واقعی** هستند (از خود یوتیوب).
- اگر روی پلن رایگان Worker به محدودیت CPU خوردی، پلن paid (۵۰ms) را فعال کن؛ پارس کردن JSON نتایج معمولاً در همان حد رایگان جا می‌شود.

## رایگانه؟

بله. Cloudflare Workers: ۱۰۰٬۰۰۰ request در روز، بدون کارت بانکی.
