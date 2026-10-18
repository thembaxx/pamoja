import manifest from "@/lib/web-manifest";

export function GET(request: Request) {
  const theme = new URL(request.url).searchParams.get("theme") === "dark" ? "dark" : "light";
  return Response.json(manifest(theme), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
