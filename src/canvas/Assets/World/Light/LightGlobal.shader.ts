import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as LightVS from "./LightGlobal.vert";

// @ts-ignore
import * as LightFS from "./LightGlobal.frag";
import { t } from "../../../Render/WebGLUtils";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export const LIGHT_GLOBAL_SHADER = new ShaderID();

export class LightGlobalShader extends Shader {
	constructor(
		program: WebGLProgram,
		public location: {
			Image: WebGLUniformLocation;
			Lights: WebGLUniformLocation;
		},
	) {
		super(program);
	}

	static create(gl: WebGL2RenderingContext) {
		const { program } = t.program(
			gl,
			[t.shader(gl, LightFS, "FRAGMENT"), t.shader(gl, LightVS, "VERTEX")],
			{
				layout_attributes: ShaderGlobals.Location,
			},
		);

		gl.useProgram(program);
		const Image = gl.getUniformLocation(program, "u_Image");
		const Lights = gl.getUniformLocation(program, "u_Lights");
		gl.useProgram(null);

		if (Image && Lights) {
			return new LightGlobalShader(program, { Image, Lights });
		} else {
			throw new Error(
				`[${this.name} -> create()] -> 
          all locations must be valid ${JSON.stringify({ Image, Lights })}`,
			);
		}
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}
