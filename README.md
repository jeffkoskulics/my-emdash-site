# my-emdash-site

EmDash blog on Cloudflare Workers, served at https://jeff.koskulics.com/blog.

- Admin: https://jeff.koskulics.com/_emdash/admin
- `/` redirects to `/blog/`; `src/worker.ts` strips/re-adds the `/blog` prefix.
- Dev: `npm install && npm run dev` · Deploy: `npm run deploy`
