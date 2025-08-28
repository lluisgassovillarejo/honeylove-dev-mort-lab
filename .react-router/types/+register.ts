import "react-router";

declare module "react-router" {
  interface Register {
    params: Params;
  }

  interface Future {
    unstable_middleware: false
  }
}

type Params = {
  "/": {};
  "/robots.txt": {};
  "/:locale?": {
    "locale"?: string;
  };
  "/:locale?/blogs/:blogHandle/:articleHandle": {
    "locale"?: string;
    "blogHandle": string;
    "articleHandle": string;
  };
  "/:locale?/api/:version/graphql.json": {
    "locale"?: string;
    "version": string;
  };
  "/:locale?/sitemap/:type/:page.xml": {
    "locale"?: string;
    "type": string;
    "page": string;
  };
  "/:locale?/blogs/:blogHandle": {
    "locale"?: string;
    "blogHandle": string;
  };
  "/:locale?/collections/:handle": {
    "locale"?: string;
    "handle": string;
  };
  "/:locale?/account/authorize": {
    "locale"?: string;
  };
  "/:locale?/collections": {
    "locale"?: string;
  };
  "/:locale?/policies/:handle": {
    "locale"?: string;
    "handle": string;
  };
  "/:locale?/products/:handle": {
    "locale"?: string;
    "handle": string;
  };
  "/:locale?/account/logout": {
    "locale"?: string;
  };
  "/:locale?/collections/all": {
    "locale"?: string;
  };
  "/:locale?/policies": {
    "locale"?: string;
  };
  "/:locale?/account/login": {
    "locale"?: string;
  };
  "/:locale?/discount/:code": {
    "locale"?: string;
    "code": string;
  };
  "/:locale?/sitemap.xml": {
    "locale"?: string;
  };
  "/:locale?/pages/:handle": {
    "locale"?: string;
    "handle": string;
  };
  "/:locale?/blogs": {
    "locale"?: string;
  };
  "/:locale?/account": {
    "locale"?: string;
  };
  "/:locale?/account/orders": {
    "locale"?: string;
  };
  "/:locale?/account/orders/:id": {
    "locale"?: string;
    "id": string;
  };
  "/:locale?/account/addresses": {
    "locale"?: string;
  };
  "/:locale?/account/profile": {
    "locale"?: string;
  };
  "/:locale?/account/*": {
    "locale"?: string;
    "*": string;
  };
  "/:locale?/search": {
    "locale"?: string;
  };
  "/:locale?/cart": {
    "locale"?: string;
  };
  "/:locale?/cart/:lines": {
    "locale"?: string;
    "lines": string;
  };
  "/:locale?/*": {
    "locale"?: string;
    "*": string;
  };
  "/graphiql": {};
  "/subrequest-profiler": {};
};