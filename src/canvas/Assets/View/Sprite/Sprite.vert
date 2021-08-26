#version 300 es

layout(location = 0) in vec2 a_Position;
// WIDTH, HEIGHT, uv_width, uv_height
layout(location = 1) in vec4 a_Sprite;
layout(location = 2) in vec3 a_Frame;
layout(location = 3) in mat3 a_Transform;

out vec2 v_UV;
flat out int v_Image;

void main(void) {
  vec2 Position = vec2(a_Position.x * a_Sprite.x, a_Position.y * a_Sprite.y);
  vec2 UV = vec2(a_Position.x * a_Sprite.z, a_Position.y * a_Sprite.w);
  vec2 Frame = vec2(a_Frame.x * a_Sprite.z, a_Frame.y * a_Sprite.w);
  gl_Position = vec4(a_Transform * vec3(Position, 1), 1);
  v_UV = UV + Frame;
  v_Image = int(a_Frame.z);
}