import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	// Cache rendered pages at Cloudflare's edge so repeat views skip the Worker
	// entirely. EmDash purges the affected pages by tag whenever content,
	// settings or menus are published, so a long max-age is safe.
	cache: { provider: cacheCloudflare() },
	routeRules: {
		"/": { maxAge: 604800 },
		"/posts": { maxAge: 604800 },
		"/posts/[slug]": { maxAge: 604800 },
		"/pages/[slug]": { maxAge: 604800 },
		"/category/[slug]": { maxAge: 604800 },
		"/tag/[slug]": { maxAge: 604800 },
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-body",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
