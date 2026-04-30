import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const routes = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/map",
    changeFrequency: "daily",
    priority: 0.95,
  },
  {
    path: "/product",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/data",
    changeFrequency: "weekly",
    priority: 0.7,
  },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
