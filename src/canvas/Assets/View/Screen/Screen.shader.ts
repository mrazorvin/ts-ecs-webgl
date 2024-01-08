import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as ScreenVS from "./Screen.vert";

// @ts-ignore
import * as ScreenFS from "./Screen.frag";
import { t } from "../../../Render/WebGLUtils";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export const SCREEN_SHADER = new ShaderID();

export class ScreenShader extends Shader {
	constructor(
		program: WebGLProgram,
		public location: { Image: WebGLUniformLocation },
	) {
		super(program);
	}

	static create(gl: WebGL2RenderingContext) {
		const { program } = t.program(
			gl,
			[t.shader(gl, ScreenFS, "FRAGMENT"), t.shader(gl, ScreenVS, "VERTEX")],
			{ layout_attributes: ShaderGlobals.Location2D },
		);

		gl.useProgram(program);
		const Image = gl.getUniformLocation(program, "u_Image");
		gl.useProgram(null);

		if (Image) {
			return new ScreenShader(program, { Image });
		}

		throw new Error(
			`[${this.name} -> create()] -> 
          all locations must be valid ${JSON.stringify({ Image })}`,
		);
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}
