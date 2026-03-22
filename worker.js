export class Terminal {
	constructor(state, env) {
		this.state = state;
		this.env = env;
	}

	async fetch(request) {
		return new Response("Terminal Container OK");
	}
}

export default {
	async fetch(request, env, ctx) {
		const id = env.TERMINAL.idFromName("main");
		const stub = env.TERMINAL.get(id);
		return await stub.fetch(request);
	}
};
