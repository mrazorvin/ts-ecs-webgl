import { MeshID } from "src/canvas/Render/Mesh";
import { Shader, ShaderID } from "src/canvas/Render/Shader";
import { ShaderGlobals } from "src/canvas/Render/ShaderGlobal";
import { Texture, TextureID } from "src/canvas/Render/Texture";
import { t } from "src/canvas/Render/WebGLUtils";
import { ComponentFactory, InitComponent } from "src/ecs/Component";

// @ts-expect-error
import * as grimmnight_back from "url:./grimmnight_back.png";
// @ts-expect-error
import * as grimmnight_bottom from "url:./grimmnight_bottom.png";
// @ts-expect-error
import * as grimmnight_front from "url:./grimmnight_front.png";
// @ts-expect-error
import * as grimmnight_left from "url:./grimmnight_left.png";
// @ts-expect-error
import * as grimmnight_right from "url:./grimmnight_right.png";
// @ts-expect-error
import * as grimmnight_top from "url:./grimmnight_top.png";

// @ts-expect-error
import * as miramar_back from "url:./miramar_back.png";
// @ts-expect-error
import * as miramar_bottom from "url:./miramar_bottom.png";
// @ts-expect-error
import * as miramar_front from "url:./miramar_front.png";
// @ts-expect-error
import * as miramar_left from "url:./miramar_left.png";
// @ts-expect-error
import * as miramar_right from "url:./miramar_right.png";
// @ts-expect-error
import * as miramar_top from "url:./miramar_top.png";

export const skybox_images = {
  grimmnight: {
    right: Texture.load_image(grimmnight_right),
    left: Texture.load_image(grimmnight_left),
    top: Texture.load_image(grimmnight_top),
    bottom: Texture.load_image(grimmnight_bottom),
    back: Texture.load_image(grimmnight_back),
    front: Texture.load_image(grimmnight_front),
  },
  miramar: {
    right: Texture.load_image(miramar_right),
    left: Texture.load_image(miramar_left),
    top: Texture.load_image(miramar_top),
    bottom: Texture.load_image(miramar_bottom),
    back: Texture.load_image(miramar_back),
    front: Texture.load_image(miramar_front),
  },
};

export class Skybox extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(
    Skybox,
    (_, day_texture, night_texture, mesh_id, shader_id) => new Skybox(day_texture, night_texture, mesh_id, shader_id),
  );
  constructor(
    public day_texture_id: TextureID,
    public night_texture_id: TextureID,
    public mesh_id: MeshID,
    public shader_id: ShaderID,
  ) {
    super();
  }
}

export class SkyboxShader extends Shader {
  info!: t.ProgramInfo;

  static create(gl: WebGL2RenderingContext) {
    const { program, info } = t.program(gl, [t.shader(gl, fragment, "FRAGMENT"), t.shader(gl, vertext, "VERTEX")], {
      layout_attributes: {
        [ShaderGlobals.Attributes.a_Position]: ShaderGlobals.a_Position,
        [ShaderGlobals.Attributes.a_Transform]: ShaderGlobals.a_Transformation,
        [ShaderGlobals.Attributes.a_UV]: ShaderGlobals.a_UV,
      },
    });

    const shader = new SkyboxShader(program);
    shader.info = info;

    return shader;
  }

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}

export const vertext = `#version 300 es
	in vec4 a_Position;
	in vec2 a_UV;

	uniform mat4 u_Transform;
	uniform mat4 u_ProjectionTransform;
	uniform mat4 u_CameraTransform;

	out vec3 in_UV;
	void main(void) {
		in_UV = a_Position.xyz;
		gl_Position = vec4(u_ProjectionTransform * u_CameraTransform * u_Transform * vec4(a_Position.xyz, 1));
	}
`;

const fragment = `#version 300 es
	precision mediump float;

  uniform float u_Time;

	uniform highp samplerCube u_NightTex;
	uniform highp samplerCube u_DayTex;

	in vec3 in_UV;
	out vec4 o_Color;
	void main(void) {
		o_Color = mix(texture(u_DayTex, in_UV), texture(u_NightTex, in_UV), abs(sin(u_Time * 0.0001)));
	}
`;
