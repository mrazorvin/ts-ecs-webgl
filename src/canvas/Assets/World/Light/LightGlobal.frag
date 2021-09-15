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
    o_Color = vec4(color1.rgb * AMBIENT * pow((color2.rgb + 1.0), vec3(2.0)), 1.0);
    if(color3.b > 0.0) {
      float power = color3.b + 1.0;
      float mult = 1.0 - power / 2.0;
      o_Color = mix(o_Color, o_Color * vec4(pow(color3.b + 1.0, 13.0 * mult)), color2.r);
    }
  } else {
    o_Color = vec4(color1.rgb * AMBIENT, 1.0);
  }

  // Bloom spirtes in fog-of-war
  // 
  // if(color3.b > 0.0) {
  //   float power = color3.b + 1.0;
  //   float mult = 1.0 - power / 2.0;
  //   vec4 bloom_c = vec4(color1.rgb * vec3(pow(color3.b + 1.0, 13.0 * mult)), 1.0);
  //   o_Color = mix(o_Color, bloom_c, color3.b * 2.0);
  // }

  if(color3.r > 0.25) {
    o_Color = vec4(o_Color.rgb * 0.5, o_Color.a);
  }
}