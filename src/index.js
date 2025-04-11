/*! MIT © Volodymyr Palamar https://github.com/gornostay25/svelte-adapter-bun */
import { serve } from "bun";
import { build_options, env } from "./env.js";
import handler from "./handler.js";

const hostname = env("HOST", "0.0.0.0");
const port = parseInt(env("PORT", 3000));
const maxRequestBodySize = parseInt(env("BODY_SIZE_LIMIT", undefined));

const { httpserver, websocket } = handler(build_options.assets ?? true);

const serverOptions = {
  baseURI: env("ORIGIN", undefined),
  maxRequestBodySize: isNaN(maxRequestBodySize) ? undefined : maxRequestBodySize,
  fetch: httpserver,
  hostname,
  port,
  development: env("SERVERDEV", build_options.development ?? false),
  error(error) {
    console.error(error);
    return new Response("Uh oh!!", { status: 500 });
  },
};

websocket ? (serverOptions.websocket = websocket) : 0;

console.info(`Listening on ${hostname + ":" + port}` + (websocket ? " (Websocket)" : ""));
const server = serve(serverOptions);

const cancelInFlightRequestsAndWebsockets = env("CANCEL_IN_FLIGHT_REQUESTS_AND_WEBSOCKETS", "true") === "true";
let shuttingDown = false;

/**
 * @param {'SIGINT' | 'SIGTERM' | 'IDLE'} reason
 */
const gracefulShutdown = async (reason) => {
  if (shuttingDown) return;
  shuttingDown = true;

  await server.stop(cancelInFlightRequestsAndWebsockets);
  // @ts-expect-error custom events cannot be typed
  process.emit("sveltekit:shutdown", reason);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
