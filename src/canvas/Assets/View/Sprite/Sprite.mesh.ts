import { Mesh, MeshID } from "../../../Render/Mesh";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export const SPRITE_MESH = new MeshID();

export class SpriteMesh extends Mesh {
	constructor(
		mode:
			| WebGL2RenderingContext["TRIANGLES"]
			| WebGL2RenderingContext["TRIANGLE_STRIP"],
		vao: WebGLVertexArrayObject,
		buffers: {
			vertex: Mesh.Buffer | null;
			normal: Mesh.Buffer | null;
			index: Mesh.Buffer | null;
			uv: Mesh.Buffer | null;
		},
		public transform_buffer: WebGLBuffer,
		public frame_buffer: WebGLBuffer,
	) {
		super(mode, vao, buffers);
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}

export namespace SpriteMesh {
	export function create_rect(gl: WebGL2RenderingContext) {
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		if (vao == null) {
			throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
		}

		const rectangle = new Float32Array([
			// vertex 1
			...[0, 0],
			...[1, 0],
			...[0, 1],

			// vertex 2
			...[0, 1],
			...[1, 0],
			...[1, 1],
		]);

		const vertex = Mesh.attribute_buffer(gl, {
			array: rectangle,
			component_length: 2,
			attribute: ShaderGlobals.Attributes.a_Position,
		});

		const sprite_buffer = gl.createBuffer()!;
		if (sprite_buffer == null) {
			throw new Error("[WebGLUtils.mesh.attribute_buffer()]");
		}

		const sprite_attrib_count = 4;
		const frame_attrib_count = 4;
		const total_attrib_count = sprite_attrib_count + frame_attrib_count;
		const stride = Float32Array.BYTES_PER_ELEMENT * total_attrib_count;

		gl.bindBuffer(gl.ARRAY_BUFFER, sprite_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, stride, gl.DYNAMIC_DRAW);

		gl.enableVertexAttribArray(ShaderGlobals.a_Sprite);
		gl.vertexAttribPointer(
			ShaderGlobals.a_Sprite,
			sprite_attrib_count,
			gl.FLOAT,
			false,
			stride,
			// start of buffer
			Float32Array.BYTES_PER_ELEMENT * 0,
		);
		gl.vertexAttribDivisor(ShaderGlobals.a_Sprite, 1);

		gl.enableVertexAttribArray(ShaderGlobals.a_Frame);
		gl.vertexAttribPointer(
			ShaderGlobals.a_Frame,
			frame_attrib_count,
			gl.FLOAT,
			false,
			stride,
			Float32Array.BYTES_PER_ELEMENT * sprite_attrib_count,
		);
		gl.vertexAttribDivisor(ShaderGlobals.a_Frame, 1);

		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		const attribute_transform_location = ShaderGlobals.a_Transformation;
		const attributes_amount_for_mat3 = 3;
		const el_per_row_count_for_mat3 = 3;
		const transformation_data = new Float32Array(
			el_per_row_count_for_mat3 * el_per_row_count_for_mat3,
		);
		const transformation_buffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, transformation_buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			transformation_data.byteLength,
			gl.DYNAMIC_DRAW,
		);
		const bytes_per_transform =
			Float32Array.BYTES_PER_ELEMENT *
			el_per_row_count_for_mat3 *
			attributes_amount_for_mat3;

		for (let i = 0; i < attributes_amount_for_mat3; i++) {
			const next_location = attribute_transform_location + i;
			gl.enableVertexAttribArray(next_location);
			// note the stride and offset
			const offset =
				i * Float32Array.BYTES_PER_ELEMENT * el_per_row_count_for_mat3;
			gl.vertexAttribPointer(
				next_location, // location
				el_per_row_count_for_mat3, // size (num values to pull from buffer per iteration)
				gl.FLOAT, // type of data in buffer
				false, // normalize
				bytes_per_transform, // stride, num bytes to advance to get to next set of values
				offset, // offset in buffer
			);
			// this line says this attribute only changes for each 1 instance
			gl.vertexAttribDivisor(next_location, 1);
		}

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		const rect = new SpriteMesh(
			gl.TRIANGLE_STRIP,
			vao,
			{
				vertex,
				uv: null,
				normal: null,
				index: null,
			},
			transformation_buffer,
			sprite_buffer,
		);

		return rect;
	}
}
