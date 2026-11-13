# SafeWay SafeMap WMS proxy

This Worker keeps the SafeMap service key off the public GitHub Pages site.

## Deploy

1. Create a Cloudflare account and open Workers & Pages.
2. Create a Worker named `safeway-safemap-proxy`.
3. Paste the contents of `worker/safemap-proxy.js` into the Worker editor and deploy.
4. In Worker Settings → Variables and Secrets, add a secret:
   - Name: `SAFEMAP_SERVICE_KEY`
   - Value: your SafeMap-issued key (do not paste it into GitHub, this repository, or chat).
5. Test the Worker URL with `?layer=bell&bbox=126.9,37.4,127.1,37.6&width=512&height=512`.
   A successful response has content type `image/png`.
6. Keep the Worker URL private until it is configured in the app. The Worker only accepts requests whose Origin is `https://cocoyerim2.github.io`.

Supported query parameters:
- `layer=bell`: official SafeMap emergency bell WMS
- `layer=light`: official SafeMap security-light WMS
- `bbox=minLon,minLat,maxLon,maxLat`: EPSG:4326 map bounds
- `width`, `height`: requested image dimensions (clamped to 256–1024)

## Important data limitation

SafeMap's current security-light page documents WMS only and says its XML point-list output is still being prepared. The WMS can show the official security-light layer on a map, but it cannot provide a reliable per-route point count or address list. Emergency bells have a documented point-list endpoint at `/openapi2/IF_0032`; the GitHub Actions workflow downloads that list when the `SAFEMAP_SERVICE_KEY` repository secret is configured.

The WMS service is marked Public Nuri Type 4 (attribution, non-commercial, no modifications). Preserve the returned image as-is and include attribution in the app.
