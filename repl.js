const object = Object.fromEntries(
  Array(64)
    .fill(0)
    .map((_, i) => [`_${i}`, i])
);

for (let i = 0; i < 10000; i++) {
  for (let y = 0; y < 64; i++) {}
}

// get multiple components collections at once
const { a, b, c, d } = world.components(hash);
