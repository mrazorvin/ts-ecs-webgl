#version 300 es

precision mediump float;

in vec2 v_UV;
uniform highp sampler2DArray u_Image;
uniform highp sampler2DArray u_Lights;

out vec4 o_Color;
void main(void) {
  float AMBIENT = 0.3;
  vec4 color1 = texture(u_Image, vec3(v_UV, 0));
  vec4 color2 = texture(u_Lights, vec3(v_UV, 0));
  vec4 color3 = texture(u_Image, vec3(v_UV, 1));

  if(color2.a > 0.0) {
    o_Color = vec4(color1.rgb * AMBIENT * pow((color2.rgb + 1.0), vec3(2.0)), color1.a);
  } else {
    o_Color = vec4(color1.rgb * AMBIENT, color1.a);
  }

  if(color3.r > 0.0) {
    o_Color = vec4(o_Color.rgb * color3.rgb * 10.0, o_Color.a);
  }
}