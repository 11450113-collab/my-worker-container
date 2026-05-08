export class Terminal {
    constructor(state) {
        this.state = state;
    }

    async fetch(request) {
        const url = new URL(request.url);
        const body = `${request.method} ${url.pathname}`;
        await this.state.storage.put("lastRequest", body);
        return new Response(`Durable Object OK: ${body}\n`, {
            headers: { "content-type": "text/plain; charset=utf-8" },
        });
    }
}

export default {
    async fetch(request, env) {
        try {
            const id = env.TERMINAL.idFromName("default");
            const terminal = env.TERMINAL.get(id);

            return await terminal.fetch(request);
        } catch (err) {
            return new Response("Worker routing error: " + err.message, { status: 500 });
        }
    },
};
