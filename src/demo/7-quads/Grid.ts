import { ShaderGlobals } from "src/canvas/Render/ShaderGlobal";
import { Mesh, MeshID } from "src/canvas/Render/Mesh";
import { fragment, vertext } from ".";
import { ShaderID, Shader } from "src/canvas/Render/Shader";
import { t } from "src/canvas/Render/WebGLUtils";
import { InitComponent, ComponentFactory } from "src/ecs/Component";

export const GRID_MESH = new MeshID();
export class GridMesh extends Mesh {
	data_buffer!: WebGLBuffer;

	static create(gl: WebGL2RenderingContext) {
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		if (vao == null) {
			throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
		}

		const size = 2;
		const lines_count = 10;
		const step = size / lines_count;
		const half = size / 2;
		const verticies: number[] = [];

		type Point = [x: number, y: number, z: number, color: number];
		type Line = [Point, Point];

		const GREY_COLOR = 0;
		const RED_COLOR = 1;
		const BLUE_COLOR = 3;
		const GREEN_COLOR = 2;
		for (let i = 0; i < lines_count; i++) {
			const rel_line_pos = -half + i * step;

			const horizontal_line: Line = [
				[rel_line_pos, 0, half, GREY_COLOR],
				[rel_line_pos, 0, -half, GREY_COLOR],
			];

			const vertical_line: Line = [
				[half, 0, rel_line_pos, GREY_COLOR],
				[-half, 0, rel_line_pos, GREY_COLOR],
			];

			verticies.push(...horizontal_line.flat(), ...vertical_line.flat());
		}

		const AXIS_SIZE = 1.1;
		const x_axis: Line = [
			[+AXIS_SIZE, 0, 0, RED_COLOR],
			[-AXIS_SIZE, 0, 0, RED_COLOR],
		];
		const y_axis: Line = [
			[0, +AXIS_SIZE, 0, GREEN_COLOR],
			[0, -AXIS_SIZE, 0, GREEN_COLOR],
		];
		const z_axis: Line = [
			[0, 0, +AXIS_SIZE, BLUE_COLOR],
			[0, 0, -AXIS_SIZE, BLUE_COLOR],
		];
		verticies.push(...x_axis.flat(), ...y_axis.flat(), ...z_axis.flat());

		const lines = new Float32Array(verticies);

		const vertices_len_per_point = 3;
		const color_len_per_point = 1;

		const stride =
			Float32Array.BYTES_PER_ELEMENT *
			(vertices_len_per_point + color_len_per_point);
		const vertex = Mesh.attribute_buffer(gl, {
			array: lines,
			component_length: vertices_len_per_point,
			attribute: ShaderGlobals.Attributes.a_Position,
			stride,
		});

		const color_attr_position = 4;
		gl.enableVertexAttribArray(color_attr_position);
		gl.vertexAttribPointer(
			color_attr_position,
			color_len_per_point,
			gl.FLOAT,
			false,
			stride,
			// start of buffer
			Float32Array.BYTES_PER_ELEMENT * vertices_len_per_point,
		);

		const transform_attribute_location = 5;
		const attributes_amount_for_mat4 = 4;
		const el_per_row_count_for_mat4 = 4;
		const data_stride =
			Float32Array.BYTES_PER_ELEMENT *
			(el_per_row_count_for_mat4 * attributes_amount_for_mat4);

		const dataBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, dataBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, data_stride, gl.STATIC_DRAW)!;

		for (let i = 0; i < attributes_amount_for_mat4; i++) {
			const next_location = transform_attribute_location + i;
			gl.enableVertexAttribArray(next_location);
			// note the stride and offset
			const offset =
				Float32Array.BYTES_PER_ELEMENT * (i * el_per_row_count_for_mat4);
			gl.vertexAttribPointer(
				next_location, // location
				el_per_row_count_for_mat4, // size (num values to pull from buffer per iteration)
				gl.FLOAT, // type of data in buffer
				false, // normalize
				data_stride, // stride, num bytes to advance to get to next set of values
				offset,
			);
			// this line says this attribute only changes for each 1 instance
			gl.vertexAttribDivisor(next_location, 1);
		}

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		const mesh = new GridMesh(
			gl.LINES as never,
			vao,
			{
				vertex,
				normal: null,
				uv: null,
				index: null,
			},
			{
				instances_count: 1,
				vertices_per_instaces: lines.length / 2,
			},
		);

		mesh.data_buffer = dataBuffer;

		return mesh;
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}
export const GRID_SHADER = new ShaderID();

export class GridShader extends Shader {
	info!: t.ProgramInfo;

	static create(gl: WebGL2RenderingContext) {
		const { program, info } = t.program(
			gl,
			[t.shader(gl, fragment, "FRAGMENT"), t.shader(gl, vertext, "VERTEX")],
			{
				layout_attributes: {
					[ShaderGlobals.Attributes.a_Position]: ShaderGlobals.a_Position,
					[ShaderGlobals.Attributes.a_Transform]:
						ShaderGlobals.a_Transformation,
				},
			},
		);

		const shader = new GridShader(program);
		shader.info = info;

		return shader;
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}
// ---------------
// ---- MAIN -----
// ---------------

export class Grid extends InitComponent({ use_pool: false }) {
	static create = ComponentFactory(Grid, (prev) => prev ?? new Grid());
}
