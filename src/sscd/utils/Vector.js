const SSCDMath = require("./Math");

// a 2d vector
class SSCDVector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

module.exports = SSCDVector;

// set vector functions
Object.assign(SSCDVector.prototype, {
  // for debug and prints
  get_name: function () {
    return "vector";
  },

  // clone vector
  clone: function () {
    return new SSCDVector(this.x, this.y);
  },

  // set value from another vector
  set: function (vector) {
    this.x = vector.x;
    this.y = vector.y;
  },

  // flip between x and y (return without changing self)
  flip: function () {
    return new SSCDVector(this.y, this.x);
  },

  // flip between x and y (change self values)
  flip_self: function () {
    this.y = [this.x, (this.x = this.y)][0];
    return this;
  },

  // make negative (return without changing self)
  negative: function () {
    return this.multiply_scalar(-1);
  },

  // make negative self (multiply by -1)
  negative_self: function () {
    this.multiply_scalar_self(-1);
    return this;
  },

  // get distance from another vector
  distance_from: function (other) {
    return SSCDMath.distance(this, other);
  },

  // get angle from another vector
  angle_from: function (other) {
    return SSCDMath.angle(this, other);
  },

  // move the position of this vector (same as add_self)
  move: function (vector) {
    this.x += vector.x;
    this.y += vector.y;
    return this;
  },

  // normalize this vector
  normalize_self: function () {
    var by = Math.sqrt(this.x * this.x + this.y * this.y);
    if (by === 0) return this;
    this.x /= by;
    this.y /= by;
    return this;
  },

  // return normalized copy (don't change self)
  normalize: function () {
    return this.clone().normalize_self();
  },

  // add vector to self
  add_self: function (other) {
    this.x += other.x;
    this.y += other.y;
    return this;
  },

  // sub vector from self
  sub_self: function (other) {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  },

  // divide vector from self
  divide_self: function (other) {
    this.x /= other.x;
    this.y /= other.y;
    return this;
  },

  // multiple this vector with another
  multiply_self: function (other) {
    this.x *= other.x;
    this.y *= other.y;
    return this;
  },

  // add scalar to self
  add_scalar_self: function (val) {
    this.x += val;
    this.y += val;
    return this;
  },

  // substract scalar from self
  sub_scalar_self: function (val) {
    this.x -= val;
    this.y -= val;
    return this;
  },

  // divide scalar from self
  divide_scalar_self: function (val) {
    this.x /= val;
    this.y /= val;
    return this;
  },

  // multiply scalar from self
  multiply_scalar_self: function (val) {
    this.x *= val;
    this.y *= val;
    return this;
  },

  // add to vector without changing self
  add: function (other) {
    return this.clone().add_self(other);
  },

  // sub from vector without changing self
  sub: function (other) {
    return this.clone().sub_self(other);
  },

  // multiply vector without changing self
  multiply: function (other) {
    return this.clone().multiply_self(other);
  },

  // divide vector without changing self
  divide: function (other) {
    return this.clone().divide_self(other);
  },

  // add scalar without changing self
  add_scalar: function (val) {
    return this.clone().add_scalar_self(val);
  },

  // substract scalar without changing self
  sub_scalar: function (val) {
    return this.clone().sub_scalar_self(val);
  },

  // multiply scalar without changing self
  multiply_scalar: function (val) {
    return this.clone().multiply_scalar_self(val);
  },

  // divide scalar without changing self
  divide_scalar: function (val) {
    return this.clone().divide_scalar_self(val);
  },

  // clamp vector values
  clamp: function (min, max) {
    if (this.x < min) this.x = min;
    if (this.y < min) this.y = min;
    if (this.x > max) this.x = max;
    if (this.y > max) this.y = max;
    return this;
  },

  // create vector from radian
  from_radian: function (rad) {
    this.x = Math.cos(rad);
    this.y = Math.sin(rad);
    return this;
  },

  // create vector from radian
  from_angle: function (angle) {
    return this.from_radian(SSCDMath.to_radians(angle));
  },

  // apply a function on x and y components on self
  apply_self: function (func) {
    this.x = func(this.x);
    this.y = func(this.y);
    return this;
  },

  // apply a function on x and y components
  apply: function (func) {
    return this.clone().apply_self(func);
  },

  // print debug
  debug: function () {
    console.debug(this.x + ", " + this.y);
  },
});

SSCDVector.ZERO = new SSCDVector(0, 0);
SSCDVector.ONE = new SSCDVector(1, 1);
SSCDVector.UP = new SSCDVector(0, -1);
SSCDVector.DOWN = new SSCDVector(0, 1);
SSCDVector.LEFT = new SSCDVector(-1, 0);
SSCDVector.RIGHT = new SSCDVector(1, 0);
SSCDVector.UP_LEFT = new SSCDVector(-1, -1);
SSCDVector.DOWN_LEFT = new SSCDVector(-1, 1);
SSCDVector.UP_RIGHT = new SSCDVector(1, -1);
SSCDVector.DOWN_RIGHT = new SSCDVector(1, 1);
