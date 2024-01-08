import { Mesh, MeshID } from "../../../Render/Mesh";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export class ScreenMesh extends Mesh {
	uv_width = 0;
	uv_height = 0;

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}

export const SCREEN_MESH = new MeshID();

export namespace ScreenMesh {
	export function create_screen(gl: WebGL2RenderingContext): Mesh {
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		if (vao == null) {
			throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
		}
		const x = -1;
		const y = -1;
		const width = 2;
		const height = 2;
		const uv_width = 1;
		const uv_height = 1;

		const uv_rectangle = new Float32Array([
			...[0, 0],
			...[uv_width, 0],
			...[0, uv_height],

			...[0, uv_height],
			...[uv_width, 0],
			...[uv_width, uv_height],
		]);

		const rectangle = new Float32Array([
			...[x, y],
			...[x + width, y],
			...[x, y + height],

			...[x, y + height],
			...[x + width, y],
			...[x + width, y + height],
		]);

		const vertex = Mesh.attribute_buffer(gl, {
			array: rectangle,
			component_length: 2,
			attribute: ShaderGlobals.Attributes.a_Position,
		});

		const uv = Mesh.attribute_buffer(gl, {
			array: uv_rectangle,
			component_length: 2,
			attribute: ShaderGlobals.Attributes.a_UV,
		});

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		const rect = new ScreenMesh(gl.TRIANGLE_STRIP, vao, {
			vertex,
			normal: null,
			uv,
			index: null,
		});

		rect.uv_height = uv_height;
		rect.uv_width = uv_width;

		return rect;
	}
}
