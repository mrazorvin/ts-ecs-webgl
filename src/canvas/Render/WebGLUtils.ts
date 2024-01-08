import { Context } from "./Context";
import { ShaderGlobals } from "./ShaderGlobal";

export namespace t {
	export function clear(
		gl: WebGL2RenderingContext,
		color?: [number, number, number, number],
	) {
		if (color) gl.clearColor(...color);
		gl.clear(gl.COLOR_BUFFER_BIT);

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
			clear(gl, undefined);
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
		} else if (typeof width === "string" && typeof height === "string") {
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
		} else {
			throw new Error(
				`[WebGLUtils.size()] {width=${width}} and {height=${height}} both must be string or number`,
			);
		}
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

    const uniforms: { [key: string]: number } = {};
		const uniformsCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
		for (let i = 0; i < uniformsCount; i++) {
			console.log(gl.getActiveUniform(program, i));
		}

		for (const shader of shaders) {
			gl.deleteShader(shader);
			gl.detachShader(program, shader);
		}

		return { program, uniforms } ;
	}

	export function get_standard_attributes_location(
		gl: WebGL2RenderingContext,
		program: WebGLProgram,
	) {
		return {
			position: gl.getAttribLocation(
				program,
				ShaderGlobals.Attributes.Position,
			),
			uv: gl.getAttribLocation(program, ShaderGlobals.Attributes.UV),
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
