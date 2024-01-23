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
  uniform vec3 u_LightPosition;

  in vec3 in_Position;
  in vec3 in_CameraPosition;
  in vec3 in_NormalDirection;

	in highp vec2 in_UV;

  out vec4 o_Color;
	void main(void) {
    float l_AmbientStrength = 0.15;

    vec4 l_BaseColor    = texture(u_Image[0], vec3(in_UV, 1));
    vec3 l_LightColor   = vec3(1.0, 1.0, 1.0);
    vec3 l_AmbientColor = l_LightColor * l_AmbientStrength;

    vec3 l_LightDirection = normalize(u_LightPosition - in_Position);
    float l_LightDistance = 1.0 - sqrt(distance(u_LightPosition, in_Position));

    float l_DiffAngle      = max(dot(in_NormalDirection, l_LightDirection), 0.0);
    float l_DiffuseStrenth = 0.4;
    vec3  l_DiffuseColor   = l_DiffAngle * l_DiffuseStrenth * l_LightColor;

    float l_SpecularMult      =  0.05;
    float l_SpecularShininess =  1.2;
    
    vec3  l_CameraDirection    = normalize(in_CameraPosition - in_Position);
    vec3  l_ReflectDirection   = reflect(-l_LightDirection, in_NormalDirection);
    float l_SpecularStrengh    = pow(max(dot(l_ReflectDirection, l_CameraDirection), 0.0), l_SpecularShininess);
    vec3  l_SpecularColor      = l_SpecularMult * l_SpecularStrengh * l_LightColor;


		o_Color = vec4(l_BaseColor.xyz * (l_AmbientColor + (l_DiffuseColor + l_SpecularColor) * l_LightDistance), 1.0);
	}
`;

export const vertext = `#version 300 es
	in vec4 a_Position;
  in vec3 a_Normal;
	in vec2 a_UV;

	uniform mat4 u_Transform;
	uniform mat4 u_ProjectionTransform;
	uniform mat4 u_CameraTransform;

  uniform mat3 u_NormalMatrix;
  uniform vec3 u_LightPosition;
	uniform vec3 u_CameraPosition;

  out vec3 in_Position;
  out vec3 in_CameraPosition;
  out vec3 in_NormalDirection;

	out highp vec2 in_UV;

	void main(void) {
    vec4 l_WorldPosition = u_Transform * vec4(a_Position.xyz, 1);

    in_CameraPosition = (inverse(u_CameraTransform) * vec4(u_CameraPosition, 1.0)).xyz;
    in_Position = l_WorldPosition.xyz;
    in_NormalDirection = u_NormalMatrix * a_Normal;

		in_UV = a_UV;
		gl_Position = vec4(u_ProjectionTransform * u_CameraTransform * l_WorldPosition);
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
