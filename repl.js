console.time("set-perf");
// prettier-ignore
const array = Array(20).fill(0).map((_, i) => i);
const set = new Set(array);

set: {
  let z = 0;
  let y = 0;
  for (let i = 0; i < 100000; i++) {
    z += set.has(y) ? 1 : -1;
    set.delete(y);
    set.add(y);
    for (const el of set) {
      z += el;
    }
    if (y >= 19) {
      y = 0;
    } else {
      y++;
    }
  }
  console.log(z);
}

console.timeEnd("set-perf");

console.time("array-perf");

array: {
  let z = 0;
  let y = 0;
  const length = array.length - 1;
  for (let i = 0; i < 100000; i++) {
    let idx = array.indexOf(y);
    if (idx !== -1) {
      z += 1;
      array[idx] = array[length];
    } else {
      z -= 1;
    }

    for (let t = 0; t < length; t++) {
      z += array[t];
    }

    if (y >= 19) {
      y = 0;
    } else {
      y++;
    }
  }
  console.log(z, array);
}

console.timeEnd("array-perf");
