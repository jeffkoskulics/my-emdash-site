import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

/**
 * The public site lives under /blog (jeff.koskulics.com/blog), but EmDash and
 * the template assume they are served from "/". Requests under /blog are
 * served with the prefix stripped, and root-relative links in HTML and
 * redirects are rewritten back under /blog. That includes the admin and API
 * (/_emdash) and build assets (/_astro): the Worker is only routed for /blog/*,
 * so anything left pointing at the root never reaches it.
 */
const BASE = "/blog";
const ROOT_PATH = /(["'`(,\s])(https?:\/\/[^/"'`\s]+)?\/(_astro|_emdash|_image|_server-islands)\b/g;

function addBase(url: string): string {
	if (!url.startsWith("/") || url.startsWith("//")) return url;
	if (url === BASE || url.startsWith(`${BASE}/`) || url.startsWith(`${BASE}?`)) return url;
	return url === "/" ? `${BASE}/` : BASE + url;
}

class PrefixAttr {
	constructor(private attr: string) {}
	element(el: Element) {
		const value = el.getAttribute(this.attr);
		if (value) el.setAttribute(this.attr, addBase(value));
	}
}

const fetch: ExportedHandlerFetchHandler<Env> = async (request, env, ctx) => {
	const url = new URL(request.url);

	if (url.pathname === "/") {
		return Response.redirect(`${url.origin}${BASE}/${url.search}`, 301);
	}

	const isBlog = url.pathname === BASE || url.pathname.startsWith(`${BASE}/`);
	if (isBlog) {
		url.pathname = url.pathname.slice(BASE.length) || "/";
		request = new Request(url, request);
	}

	const response = await handler.fetch!(request as never, env, ctx);

	const location = response.headers.get("Location");
	if (location) {
		const loc = new URL(location, url);
		if (loc.origin === url.origin) {
			const fixed = addBase(loc.pathname) + loc.search + loc.hash;
			if (fixed !== loc.pathname + loc.search + loc.hash) {
				const headers = new Headers(response.headers);
				headers.set("Location", fixed);
				return new Response(response.body, { status: response.status, headers });
			}
		}
	}

	const type = response.headers.get("Content-Type") ?? "";
	if (!isBlog || !/text\/html|text\/css|javascript/.test(type)) {
		return response;
	}

	const rewritten = type.includes("text/html")
		? new HTMLRewriter()
				.on("a[href]", new PrefixAttr("href"))
				.on("link[href]", new PrefixAttr("href"))
				.on("form[action]", new PrefixAttr("action"))
				.transform(response)
		: response;

	// Catch what the attribute rewriter can't: inline @font-face urls, srcsets,
	// absolute same-origin image URLs, data-endpoint, and paths hardcoded in JS.
	const body = (await rewritten.text()).replace(ROOT_PATH, (match, pre, origin, dir) =>
		!origin || origin === url.origin ? `${pre}${BASE}/${dir}` : match,
	);
	const headers = new Headers(rewritten.headers);
	headers.delete("Content-Length");
	headers.delete("ETag");
	return new Response(body, { status: rewritten.status, statusText: rewritten.statusText, headers });
};

export default {
	...handler,
	fetch,
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler<Env>;
