import { ShaderGlobals } from "src/canvas/Render/ShaderGlobal";
import { Mesh, MeshID } from "src/canvas/Render/Mesh";
import { ShaderID, Shader } from "src/canvas/Render/Shader";
import { t } from "src/canvas/Render/WebGLUtils";
import { ComponentFactory, InitComponent } from "src/ecs/Component";
import { TextureID } from "src/canvas/Render/Texture";

export const QUAD_MESH = new MeshID();
export class QuadMesh extends Mesh {
	static create(gl: WebGL2RenderingContext) {
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		if (vao == null) {
			throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
		}

		type Point = [x: number, y: number, z: number];

		const quad_size = 0.5;
		const top_left: Point = [-quad_size, +quad_size, 0];
		const bottom_left: Point = [-quad_size, -quad_size, 0];
		const bottom_right: Point = [+quad_size, -quad_size, 0];
		const top_right: Point = [+quad_size, +quad_size, 0];

		const vertex = Mesh.attribute_buffer(gl, {
			array: new Float32Array([...top_left.flat(), ...bottom_left.flat(), ...bottom_right.flat(), ...top_right.flat()]),
			component_length: 3,
			attribute: ShaderGlobals.Attributes.a_Position,
		});

		const uv = Mesh.attribute_buffer(gl, {
			array: new Float32Array([...[0, 0], ...[0, 1], ...[1, 1], ...[1, 0]]),
			component_length: 2,
			attribute: ShaderGlobals.Attributes.a_UV,
		});

		const index = Mesh.index_buffer(gl, {
			array: new Uint16Array([...[0, 1, 2], ...[2, 3, 0]]),
		});

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		const mesh = new QuadMesh(
			gl.TRIANGLES,
			vao,
			{
				vertex,
				uv,
				index: index,
				normal: null,
			},
			{
				instances_count: 1,
				vertices_per_instaces: 4,
			},
		);

		mesh.enable_blending = true;
		mesh.disable_culling = true;

		return mesh;
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}

export const QUAD_SHADER = new ShaderID();
export class QuadShader extends Shader {
	info!: t.ProgramInfo;

	static create(gl: WebGL2RenderingContext) {
		const { program, info } = t.program(gl, [t.shader(gl, fragment, "FRAGMENT"), t.shader(gl, vertext, "VERTEX")], {
			layout_attributes: {
				[ShaderGlobals.Attributes.a_Position]: ShaderGlobals.a_Position,
				[ShaderGlobals.Attributes.a_Transform]: ShaderGlobals.a_Transformation,
				[ShaderGlobals.Attributes.a_UV]: ShaderGlobals.a_UV,
			},
		});

		const shader = new QuadShader(program);
		shader.info = info;

		return shader;
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}

export const fragment = `#version 300 es
	precision mediump float;

uniform highp sampler2DArray u_Image[1];

	in vec2 in_UV;
	out vec4 o_Color;
	void main(void) {
		o_Color = texture(u_Image[0], vec3(in_UV, 1));
	}
`;

export const vertext = `#version 300 es
	in vec3 a_Position;
	in vec2 a_UV;

	uniform mat4 u_Transform;
	uniform mat4 u_ProjectionTransform;
	uniform mat4 u_CameraTransform;

	out vec2 in_UV;
	void main(void) {
		in_UV = a_UV;
		gl_Position = vec4(u_ProjectionTransform * u_CameraTransform * u_Transform * vec4(a_Position, 1));
	}
`;

export class Quad extends InitComponent({ use_pool: false }) {
	static create = ComponentFactory(Quad, (_, texture) => new Quad(texture));
	constructor(public texture: TextureID) {
		super();
	}
}
