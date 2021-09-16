#version 300 es
precision mediump float;

uniform vec2 u_Resolution;
uniform highp sampler2DArray u_Collisions;

in vec2 v_UV;
flat in vec2 v_Origin;

// Rendering parameters
#define FADE_POWER		    2.0
#define AMBIENT			      0.5
#define FADE_FREQUENCY		6.0
#define FADE_VARIATION		0.1

#define DELTA	0.001

// Return the distance to the nearest wall
bool collision_distance(vec2 ray_origin, vec2 ray_direction) {
  vec2 next_pos = ray_origin;
  vec2 check_direction = ray_direction * 0.005;
  bool found = false;
  for(int ray_step = 0; ray_step < 8; ray_step++) {
    next_pos = ray_origin + check_direction * float(ray_step);
    if(length(v_Origin - next_pos) <= 0.01) {
      break;
    }
    if(texture(u_Collisions, vec3(next_pos / 2.0 + 0.5, 0)).r > 0.1) {
      found = true;
      break;
    }
  }
  for(int ray_step = 0; ray_step < 8; ray_step++) {
    next_pos = ray_origin + check_direction * float(ray_step + 8);
    if(length(v_Origin - next_pos) <= 0.01) {
      break;
    }
    if(texture(u_Collisions, vec3(next_pos / 2.0 + 0.5, 0)).r > 0.1) {
      found = true;
      break;
    }
  }

	// Return the distance to the hit point
  return found;
}

out vec4 o_Color;
void main(void) {
  float mult = u_Resolution.x / u_Resolution.y;
  vec2 light_pos = vec2(v_Origin.x * mult, v_Origin.y);
  vec2 ray_origin_pos = vec2(v_UV.x * mult, v_UV.y);
  vec2 light_direction = light_pos - ray_origin_pos;
  float light_distance = length(light_direction);
  // bool shadow = collision_distance(v_UV, (v_Origin - v_UV) / length(v_Origin - v_UV));

  if(light_distance < 0.5) {
    float light_intensity = max(0.0, 0.5 - light_distance);
    o_Color = vec4(0.55, 0.54, 0.54, 1);
    o_Color *= vec4(light_intensity);
    o_Color = o_Color * mix(light_intensity, 1.0, AMBIENT) * 4.0;
    o_Color = vec4(o_Color.rgb, max(o_Color.r, 0.01));
  } else {
    discard;
  }
}