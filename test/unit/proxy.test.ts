// @vitest-environment node
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const request = (url: string) => new NextRequest(new Request(url));

describe("proxy: malformed URLs", () => {
  // Next's router throws "failed to decode param" on a segment that isn't a
  // valid percent-encoding and answers 500 before any route code runs. The
  // proxy sees the request first, so it turns those into a plain 404.
  it.each([
    "/set/%",
    "/collection/%",
    "/card/%",
    "/faqs/%",
    "/faqs/set/%",
    "/facts/%",
    "/pokemon/%",
    "/pokedex/%",
    "/illustrator/%",
    "/b/%",
    "/api/cards/%",
    "/pokemon/%E9",
    "/pokemon/pika%chu",
  ])("404s %s", (path) => {
    expect(proxy(request(`http://localhost:3170${path}`)).status).toBe(404);
  });

  it.each([
    "/",
    "/sets",
    "/pokemon/pikachu",
    "/pokemon/nidoran%E2%99%80",
    "/pokemon/flab%C3%A9b%C3%A9",
    "/illustrator/ken-sugimori~34n",
    "/pokemon/%2525",
  ])("passes %s through untouched", (path) => {
    expect(proxy(request(`http://localhost:3170${path}`)).status).toBe(200);
  });
});
