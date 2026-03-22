import { Container } from "@cloudflare/containers";

export class Terminal extends Container {
  defaultPort = 7860;
  sleepAfter = "10m";
}

export default {
  async fetch(request, env) {
    const id = env.TERMINAL.idFromName("main");
    const stub = env.TERMINAL.get(id);
    return stub.fetch(request);
  },
};
