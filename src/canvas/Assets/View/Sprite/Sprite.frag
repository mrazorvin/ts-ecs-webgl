#version 300 es

precision mediump float;

uniform sampler2D u_Image[16];

flat in int v_Image;
in vec2 v_UV;

out vec4 o_Color;

vec4 sampler(int pos) {
  if (pos == 0) return texture(u_Image[0], v_UV);
  if (pos == 1) return texture(u_Image[1], v_UV);
  if (pos == 2) return texture(u_Image[2], v_UV);
  if (pos == 3) return texture(u_Image[3], v_UV);
  if (pos == 4) return texture(u_Image[4], v_UV);
  if (pos == 5) return texture(u_Image[5], v_UV);
  if (pos == 6) return texture(u_Image[6], v_UV);
  if (pos == 7) return texture(u_Image[7], v_UV);
  if (pos == 8) return texture(u_Image[8], v_UV);
  if (pos == 9) return texture(u_Image[9], v_UV);
  if (pos == 10) return texture(u_Image[10], v_UV);
  if (pos == 11) return texture(u_Image[11], v_UV);
  if (pos == 12) return texture(u_Image[12], v_UV);
  if (pos == 13) return texture(u_Image[13], v_UV);
  if (pos == 14) return texture(u_Image[14], v_UV);
  if (pos == 15) return texture(u_Image[15], v_UV);
}

void main(void) {
  o_Color = sampler(v_Image);
}


