import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as LightVS from "./Light.vert";

// @ts-ignore
import * as LightFS from "./Light.frag";
import { t } from "../../../Render/WebGLUtils";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export const LIGHT_SHADER = new ShaderID();

export class LightShader extends Shader {
	constructor(
		program: WebGLProgram,
		public location: {
			Transform: WebGLUniformLocation;
			Resolution: WebGLUniformLocation;
			WidthHeight: WebGLUniformLocation;
			WorldTransform: WebGLUniformLocation;
			CameraTransform: WebGLUniformLocation;
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
		const Transform = gl.getUniformLocation(program, "u_Transform");
		const Resolution = gl.getUniformLocation(program, "u_Resolution");
		const WidthHeight = gl.getUniformLocation(program, "u_WidthHeight")!;
		const WorldTransform = gl.getUniformLocation(program, "u_WorldTransform");
		const CameraTransform = gl.getUniformLocation(program, "u_CameraTransform");
		gl.useProgram(null);

		if (
			Transform &&
			Resolution &&
			WorldTransform &&
			CameraTransform &&
			WidthHeight
		) {
			return new LightShader(program, {
				Transform,
				WorldTransform,
				CameraTransform,
				Resolution,
				WidthHeight,
			});
		} else {
			throw new Error(
				`[${LightShader.name} -> create()] -> 
          all locations must be valid ${JSON.stringify({
						Transform,
						WorldTransform,
						CameraTransform,
						Resolution,
					})}`,
			);
		}
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}
