#version 300 es

precision mediump float;

uniform sampler2D u_Image[16];

flat in vec2 v_Resloution;
flat in float v_Color;
flat in int v_Image;
in vec2 v_UV;

out vec4 o_Color;


vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
  vec4 pixel = texture(image, uv);
  if (v_Color > 8.0) {
    vec4 color = vec4(0.0);
    vec2 off1 = vec2(1.3846153846) * direction;
    vec2 off2 = vec2(3.2307692308) * direction;
    color += pixel * 0.2270270270;
    color += texture(image, uv + (off1 / resolution)) * 0.3162162162;
    color += texture(image, uv - (off1 / resolution)) * 0.3162162162;
    color += texture(image, uv + (off2 / resolution)) * 0.0702702703;
    color += texture(image, uv - (off2 / resolution)) * 0.0702702703;
    return color;
  } else {
    return texture(image, uv);
  }
}


vec4 sampler(int pos) {
  vec2 resolution = v_Resloution *2.0;
  vec2 direction = vec2(1, 0);
  if (pos == 0) return blur9(u_Image[0], v_UV, resolution, direction);
  if (pos == 1) return blur9(u_Image[1], v_UV, resolution, direction);
  if (pos == 2) return blur9(u_Image[2], v_UV, resolution, direction);
  if (pos == 3) return blur9(u_Image[3], v_UV, resolution, direction);
  if (pos == 4) return blur9(u_Image[4], v_UV, resolution, direction);
  if (pos == 5) return blur9(u_Image[5], v_UV, resolution, direction);
  if (pos == 6) return blur9(u_Image[6], v_UV, resolution, direction);
  if (pos == 7) return blur9(u_Image[7], v_UV, resolution, direction);
  if (pos == 8) return blur9(u_Image[8], v_UV, resolution, direction);
  if (pos == 9) return blur9(u_Image[9], v_UV, resolution, direction);
  if (pos == 10) return blur9(u_Image[10], v_UV, resolution, direction);
  if (pos == 11) return blur9(u_Image[11], v_UV, resolution, direction);
  if (pos == 12) return blur9(u_Image[12], v_UV, resolution, direction);
  if (pos == 13) return blur9(u_Image[13], v_UV, resolution, direction);
  if (pos == 14) return blur9(u_Image[14], v_UV, resolution, direction);
  if (pos == 15) return blur9(u_Image[15], v_UV, resolution, direction);
}

void main(void) {
  vec4 color = sampler(v_Image);
  if (v_Color > 8.0 && color.a > 0.01) {
    color.r *= 0.05;
    color.g *= 0.05;
    color.b *= 0.05;
    color.a = color.a > 0.3 ? 0.25 : color.a;
  }
  o_Color = color;
}


