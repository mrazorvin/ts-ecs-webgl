import { Context } from "./Context";
import { Mesh } from "./Mesh";
import { ShaderGlobals } from "./ShaderGlobal";

export namespace t {
	interface Uniform {
		type: number;
		index: WebGLUniformLocation;
	}

	export class ProgramInfo {
		private _uniforms: { [key: string]: Uniform } = {};
		private _mapping: {
			[key: string]: {
				fn: (
					gl: WebGL2RenderingContext,
					uniform: Uniform,
					// biome-ignore lint/suspicious/noExplicitAny: this type is know only at runime
					data: any,
				) => void;
				type: new () => unknown;
				name: string;
			};
		};

		constructor(
			private gl: WebGL2RenderingContext,
			private _program: WebGLProgram,
		) {
			this._mapping = {
				[gl.FLOAT_MAT3]: {
					fn: (
						gl: WebGL2RenderingContext,
						uniform: Uniform,
						data: Float32Array,
					) => {
						gl.uniformMatrix3fv(uniform.index, false, data);
					},
					type: Float32Array,
					name: "FLOAT_MAT3",
				},
				[gl.FLOAT_MAT4]: {
					fn: (
						gl: WebGL2RenderingContext,
						uniform: Uniform,
						data: Float32Array,
					) => {
						gl.uniformMatrix4fv(uniform.index, false, data);
					},
					type: Float32Array,
					name: "FLOAT_MAT4",
				},
				[gl.FLOAT_VEC3]: {
					fn: (
						gl: WebGL2RenderingContext,
						uniform: Uniform,
						data: Float32Array,
					) => {
						gl.uniform3fv(uniform.index, data);
					},
					type: Float32Array,
					name: "FLOAT_VEC3",
				},
			};
		}

		use(
			data: {
				uniforms: { [key: string]: unknown };
				mesh: Mesh;
			},
			fn?: (gl: WebGL2RenderingContext) => unknown,
		) {
			this.gl.useProgram(this._program);
			const uniforms = data.uniforms;

			for (const key in this._uniforms) {
				const uniform = this._uniforms[key]!;
				const data = uniforms[key];
				const mapping = this._mapping[uniform?.type!];

				if (data == null) {
					console.error("All required unirorms", this._uniforms);
					throw new Error(`uniform: [${key}]  is required`);
				}

				if (mapping == null) {
					console.error("All supported unirorms types", this._mapping);
					throw new Error(`mapping for uniform: [${key}] type not found`);
				}

				if (!(data instanceof mapping.type)) {
					console.error("All supported unirorms types", { data, uniform });
					throw new Error(`data type for uniform: [${key}] is invalid`);
				}

				mapping.fn(this.gl, uniform, data);
			}

			data.mesh.render(this.gl, fn);

			this.gl.useProgram(null);
		}
	}

	export function clear(
		gl: WebGL2RenderingContext,
		color?: [number, number, number, number],
	) {
		if (color) gl.clearColor(...color);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		return gl;
	}

	export function blend(gl: WebGL2RenderingContext) {
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ZERO);

		return gl;
	}

	export function buffer(
		gl: WebGL2RenderingContext,
		context: Context | undefined,
	) {
		if (context === undefined) {
			return gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, context.frame_buffer);
		if (context.need_clear) {
			context.need_clear = false;
			clear(gl, [1, 1, 1, 1]);
		}
	}

	export function size(
		gl: WebGL2RenderingContext,
		width: number | string,
		height: number | string,
	) {
		// @ts-ignore
		const canvas = gl.canvas as HTMLCanvasElement;
		const dpr = window.devicePixelRatio;

		if (typeof width === "number" && typeof height === "number") {
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;

			canvas.width = width;
			canvas.height = height;

			gl.viewport(0, 0, width, height);

			return { width, height, canvas_w: width, canvas_h: height };
		}

		if (typeof width === "string" && typeof height === "string") {
			canvas.style.width = width;
			canvas.style.height = height;

			const rect = canvas.getBoundingClientRect();

			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			gl.viewport(0, 0, rect.width * dpr, rect.height * dpr);

			return {
				width: canvas.width,
				height: canvas.height,
				canvas_w: rect.width,
				canvas_h: rect.height,
			};
		}

		throw new Error(
			`[WebGLUtils.size()] {width=${width}} and {height=${height}} both must be string or number`,
		);
	}

	export function shader(
		gl: WebGL2RenderingContext,
		src: string,
		type: "VERTEX" | "FRAGMENT",
	) {
		const shader = gl.createShader(
			type === "VERTEX" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER,
		)!;
		gl.shaderSource(shader, src);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const msg = `can't compile shader ${type}`;
			console.error(msg, src, gl.getShaderInfoLog(shader));
			throw new Error(msg);
		}

		return shader;
	}

	export function program(
		gl: WebGL2RenderingContext,
		shaders: WebGLShader[],
		options: {
			layout_attributes: { [key: string]: number } | false;
		},
	) {
		const program = gl.createProgram()!;
		for (const shader of shaders) {
			gl.attachShader(program, shader);
		}

		if (options.layout_attributes) {
			for (const attribute_name in options.layout_attributes) {
				const position = options.layout_attributes[attribute_name]!;
				gl.bindAttribLocation(program, position, attribute_name);
			}
		}

		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const msg = "Can't compile program";
			window.alert(msg);
			console.error(msg, gl.getProgramInfoLog(program));
			throw new Error(msg);
		}

		const programInfo = new ProgramInfo(gl, program);
		const uniformsCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
		for (let i = 0; i < uniformsCount; i++) {
			const uniform = gl.getActiveUniform(program, i);
			if (uniform) {
				// @ts-expect-error
				programInfo._uniforms[uniform.name] =
					// expect error won't affect this line
					{
						type: uniform.type,
						index: gl.getUniformLocation(program, uniform.name)!,
					};
			}
		}

		for (const shader of shaders) {
			gl.deleteShader(shader);
			gl.detachShader(program, shader);
		}

		return { program, info: programInfo };
	}

	export function get_standard_attributes_location(
		gl: WebGL2RenderingContext,
		program: WebGLProgram,
	) {
		return {
			position: gl.getAttribLocation(
				program,
				ShaderGlobals.Attributes.a_Position,
			),
			uv: gl.getAttribLocation(program, ShaderGlobals.Attributes.a_UV),
		};
	}

	export namespace buffer {
		export function array(
			gl: WebGL2RenderingContext,
			array: Float32Array,
			is_static = true,
		) {
			const buffer = gl.createBuffer();

			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				array,
				is_static ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW,
			);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);

			return buffer;
		}
	}
}
