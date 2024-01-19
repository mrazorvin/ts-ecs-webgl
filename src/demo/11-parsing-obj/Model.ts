import { ShaderGlobals } from "src/canvas/Render/ShaderGlobal";
import { ShaderID, Shader } from "src/canvas/Render/Shader";
import { t } from "src/canvas/Render/WebGLUtils";
import { MeshID } from "src/canvas/Render/Mesh";
import { TextureID } from "src/canvas/Render/Texture";
import { InitComponent, ComponentFactory } from "src/ecs/Component";

export const MODEL_SHADER = new ShaderID();
export class ModelShader extends Shader {
  info!: t.ProgramInfo;

  static create(gl: WebGL2RenderingContext) {
    const { program, info } = t.program(gl, [t.shader(gl, fragment, "FRAGMENT"), t.shader(gl, vertext, "VERTEX")], {
      layout_attributes: {
        [ShaderGlobals.Attributes.a_Position]: ShaderGlobals.a_Position,
        [ShaderGlobals.Attributes.a_Transform]: ShaderGlobals.a_Transformation,
        [ShaderGlobals.Attributes.a_UV]: ShaderGlobals.a_UV,
      },
    });

    const shader = new ModelShader(program);
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
	in vec4 a_Position;
	in vec2 a_UV;

	uniform mat4 u_Transform;
	uniform mat4 u_ProjectionTransform;
	uniform mat4 u_CameraTransform;

	out vec2 in_UV;
	void main(void) {
		in_UV = a_UV;
		gl_Position = vec4(u_ProjectionTransform * u_CameraTransform * u_Transform * vec4(a_Position.xyz, 1));
	}
`;

export class Model extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(
    Model,
    (_, texture_id, mesh_id, shader_id) => new Model(texture_id, mesh_id, shader_id),
  );
  constructor(
    public texture_id: TextureID,
    public mesh_id: MeshID,
    public shader_id: ShaderID,
  ) {
    super();
  }
}
