import { Container } from "@cloudflare/containers";

export class Terminal extends Container {
    defaultPort = 7860;
}

export default {
    async fetch(request, env) {
        try {
            const id = env.TERMINAL.idFromName("default");
            const containerInstance = env.TERMINAL.get(id);

            return await containerInstance.fetch(request);
        } catch (err) {
            return new Response("Worker routing error: " + err.message, { status: 500 });
        }
    },
};
