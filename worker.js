import { Container } from "@cloudflare/containers";

export class Terminal extends Container {
    defaultPort = 7860;
}

export class TerminalContainer extends Container {
    defaultPort = 7860;
}

export default {
    async fetch(request, env) {
        try {
            const id = env.TERMINAL_CONTAINER.idFromName("default");
            const containerInstance = env.TERMINAL_CONTAINER.get(id);

            return await containerInstance.fetch(request);
        } catch (err) {
            return new Response("Worker routing error: " + err.message, { status: 500 });
        }
    },
};
