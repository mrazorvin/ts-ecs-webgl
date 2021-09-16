#version 300 es

layout(location = 0) in vec2 a_Position;
uniform mediump vec2 u_WidthHeight;

uniform mat3 u_WorldTransform;
uniform mat3 u_CameraTransform;
uniform mat3 u_Transform;

out mediump vec2 v_UV;
flat out vec2 v_Origin;

void main(void) {
  mat3 transform = u_WorldTransform * u_CameraTransform * u_Transform;
  vec2 position = vec2(a_Position.x * u_WidthHeight.x, a_Position.y * u_WidthHeight.y);
  gl_Position = vec4(transform * vec3(position, 1), 1);
  v_UV = (transform * vec3(position, 1)).xy;
  v_Origin = (transform * vec3(0.5 * u_WidthHeight.x, 0.5 * u_WidthHeight.y, 1)).xy;
}