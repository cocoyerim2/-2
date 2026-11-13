const ALLOWED_ORIGIN = "https://cocoyerim2.github.io";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }
    if (origin !== ALLOWED_ORIGIN) {
      return new Response("Origin not allowed", { status: 403, headers: cors });
    }
    if (!env.SAFEMAP_SERVICE_KEY) {
      return new Response("SafeMap key is not configured on the proxy.", { status: 503, headers: cors });
    }

    const incoming = new URL(request.url);
    const kind = incoming.searchParams.get("layer");
    const config = {
      light: {
        endpoint: "https://www.safemap.go.kr/openapi2/IF_0102_WMS",
        layers: "A2SM_CMMNPOI_SECULIGHT",
        styles: "A2SM_CMMNPOI_07"
      },
      bell: {
        endpoint: "https://www.safemap.go.kr/openapi2/IF_0032_WMS",
        layers: "A2SM_CMMNPOI_EMGBELL",
        styles: "A2SM_CMMNPOI_EMGBELL"
      }
    }[kind];
    if (!config) {
      return new Response("Use layer=light or layer=bell.", { status: 400, headers: cors });
    }

    const bbox = incoming.searchParams.get("bbox") || "";
    const values = bbox.split(",").map(Number);
    if (values.length !== 4 || values.some(v => !Number.isFinite(v)) ||
        values[0] >= values[2] || values[1] >= values[3] ||
        values[0] < 124 || values[2] > 132 || values[1] < 32 || values[3] > 40) {
      return new Response("Invalid Korea map bounds.", { status: 400, headers: cors });
    }
    const width = Math.max(256, Math.min(1024, Number(incoming.searchParams.get("width")) || 768));
    const height = Math.max(256, Math.min(1024, Number(incoming.searchParams.get("height")) || 768));
    const upstream = new URL(config.endpoint);
    upstream.search = new URLSearchParams({
      serviceKey: env.SAFEMAP_SERVICE_KEY,
      srs: "EPSG:4326",
      bbox: values.join(","),
      format: "image/png",
      width: String(Math.round(width)),
      height: String(Math.round(height)),
      transparent: "TRUE",
      layers: config.layers,
      styles: config.styles
    }).toString();

    try {
      const response = await fetch(upstream.toString(), {
        headers: { "Accept": "image/png" },
        cf: { cacheTtl: 60, cacheEverything: true }
      });
      const contentType = response.headers.get("Content-Type") || "";
      if (!response.ok || !contentType.includes("image")) {
        // Do not forward provider bodies that might echo request details or credentials.
        return new Response("SafeMap WMS request failed (" + response.status + "). Check key approval and service permissions.", {
          status: 502, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
        });
      }
      return new Response(response.body, {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=60",
          "X-Content-Type-Options": "nosniff"
        }
      });
    } catch (_) {
      return new Response("SafeMap service is temporarily unreachable.", {
        status: 502, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  }
};
