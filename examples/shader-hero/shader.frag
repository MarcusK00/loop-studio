float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

mat2 rot2(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float mapSDF(vec3 p, float ang) {
  vec3 q = p;
  q.xz *= rot2(ang);
  q.xy *= rot2(ang);

  vec2 t = vec2(length(q.xz) - 0.68, q.y);
  float torus = length(t) - 0.22;

  float d = torus;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float oa = ang * 2.0 + fi * (u_tau / 3.0);
    vec3 sp = vec3(cos(oa) * 0.86, sin(oa) * 0.86, sin(ang + fi * 2.094) * 0.34);
    d = smin(d, length(p - sp) - 0.21, 0.34);
  }
  return d;
}

vec3 calcNormal(vec3 p, float ang) {
  vec2 e = vec2(0.0025, 0.0);
  return normalize(vec3(
    mapSDF(p + e.xyy, ang) - mapSDF(p - e.xyy, ang),
    mapSDF(p + e.yxy, ang) - mapSDF(p - e.yxy, ang),
    mapSDF(p + e.yyx, ang) - mapSDF(p - e.yyx, ang)
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float ang = u_phase * u_tau;

  // Cyclic aurora background mist
  float wave = 0.5 + 0.5 * sin(uv.x * 3.0 + uv.y * 2.4 + ang);
  float glowBg = exp(-dot(uv, uv) * 1.9);
  vec3 bg = mix(u_ground, u_surface, glowBg * (0.65 + 0.35 * wave));
  bg += u_spark * (0.08 * glowBg * wave);

  vec3 ro = vec3(0.0, 0.0, 3.45);
  vec3 rd = normalize(vec3(uv, -1.65));

  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 52; i++) {
    vec3 p = ro + rd * t;
    float d = mapSDF(p, ang);
    if (d < 0.0018) {
      hit = true;
      break;
    }
    t += d;
    if (t > 5.0) break;
  }

  vec3 col = bg;
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p, ang);
    vec3 v = normalize(ro - p);
    vec3 l1 = normalize(vec3(1.2, 1.4, 1.6));
    vec3 l2 = normalize(vec3(-1.4, -0.8, 1.0));

    float diff1 = max(dot(n, l1), 0.0);
    float diff2 = max(dot(n, l2), 0.0);
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.6);
    float spec = pow(max(dot(reflect(-l1, n), v), 0.0), 28.0);

    vec3 irid = mix(u_accent, u_spark, 0.5 + 0.5 * sin(dot(n, vec3(2.2, 1.8, -1.5)) + ang));
    col = u_surface * 0.45 + irid * (0.35 + 0.72 * diff1) + u_spark * (0.35 * diff2);
    col += mix(u_accent, u_body, 0.5) * fresnel * 0.85;
    col += u_body * spec * 0.65;
  }

  col = pow(clamp(col, 0.0, 1.0), vec3(0.95));
  fragColor = vec4(col, 1.0);
}
