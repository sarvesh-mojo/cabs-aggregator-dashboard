import type { Connect, Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

const ALLOWED_MAPS_PATHS = new Set([
  "/placeSearch",
  "/placeDetails",
  "/distanceMatrix",
]);

const SPOOF_ORIGIN = "https://mojo-fe-testing.bookairportcab.com";

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function handleMapsProxy(
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction
) {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (!url.pathname.startsWith("/ops-maps")) {
      return next();
    }

    const suffix = url.pathname.slice("/ops-maps".length) || "/";
    if (!ALLOWED_MAPS_PATHS.has(suffix)) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "failure", message: "Unknown maps path" }));
      return;
    }

    const partnerHost = String(req.headers["x-partner-host"] || "")
      .trim()
      .replace(/\/$/, "");
    const authorization = String(req.headers.authorization || "").trim();

    if (!partnerHost.startsWith("https://") || !partnerHost.includes("bookairportcab.com")) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          status: "failure",
          message: "Missing or invalid X-Partner-Host header",
        })
      );
      return;
    }

    if (!authorization) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          status: "failure",
          message: "Missing Authorization header",
        })
      );
      return;
    }

    const target = `${partnerHost}/api/v1/maps${suffix}${url.search}`;
    const init: RequestInit = {
      method: req.method || "GET",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        Origin: SPOOF_ORIGIN,
        Referer: `${SPOOF_ORIGIN}/`,
        correlationId:
          String(req.headers.correlationid || req.headers["correlation-id"] || "") ||
          crypto.randomUUID(),
      },
    };

    if (req.method && req.method !== "GET" && req.method !== "HEAD") {
      const body = await readBody(req);
      init.body = body;
      (init.headers as Record<string, string>)["Content-Type"] =
        String(req.headers["content-type"] || "application/json");
    }

    const upstream = await fetch(target, init);
    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.end(text);
  } catch (error: any) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "failure",
        message: error?.message || "Maps proxy failed",
      })
    );
  }
}

/** Local-only proxy so Vite (localhost) can call partner /maps without origin 403. */
export function mapsDevProxyPlugin(): Plugin {
  return {
    name: "ops-maps-dev-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleMapsProxy(req, res, next);
      });
    },
  };
}
