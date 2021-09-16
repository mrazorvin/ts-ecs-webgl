#version 300 es

// x, y
layout(location = 0) in vec2 a_Position;
// sprite_width, sprite_height, sprite_uv_width, sprite_uv_height
layout(location = 1) in vec4 a_Sprite;
// frame_x, frame_y, frame_image = 0..15, frame type: < 8 = normal, > 8 = shadow
layout(location = 2) in vec4 a_Frame;
layout(location = 3) in mat3 a_Transform;

uniform mat3 u_WorldTransform;
uniform mat3 u_CameraTransform;

out vec2 v_UV;
flat out vec2 v_Resloution;
flat out int v_Image;
flat out float v_Color;

void main(void) {
  vec2 Position = vec2(a_Position.x * a_Sprite.x, a_Position.y * a_Sprite.y);
  vec2 UV = vec2(a_Position.x * a_Sprite.z, a_Position.y * a_Sprite.w);
  vec2 Frame = vec2(a_Frame.x * a_Sprite.z, a_Frame.y * a_Sprite.w);
  gl_Position = vec4(u_WorldTransform * u_CameraTransform * a_Transform * vec3(Position, 1), 1);
  v_UV = UV + Frame;
  v_Image = int(a_Frame.z);
  v_Color = a_Frame.w;
  v_Resloution = vec2(a_Sprite.x / a_Sprite.z, a_Sprite.y / a_Sprite.w);
}