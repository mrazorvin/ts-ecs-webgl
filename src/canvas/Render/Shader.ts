import { Mesh } from "./Mesh";

export class ShaderID {
	// @ts-expect-error
	#type: ShaderID;
}

export abstract class Shader {
	id: ShaderID;

	// biome-ignore lint/suspicious/noExplicitAny: requried for extendability
	constructor(public program: WebGLProgram, ...args: any[]) {
		this.id = new ShaderID();
	}

	default_dispose(gl: WebGL2RenderingContext) {
		gl.deleteProgram(this.program);
	}

	abstract dispose(gl: WebGL2RenderingContext): void;
}

export namespace Shader {}
