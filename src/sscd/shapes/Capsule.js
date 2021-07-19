const SSCDVector = require("../utils/Vector");
const SSCDShape = require("./Shape");
const SSCDCircle = require("./Circle");
const SSCDRectangle = require("./Rectangle");

class SSCDCapsule extends SSCDShape {
  // create a capsule shape. implemented by a composite-shape with two circles and a rectangle.
  // @param position - optional starting position (vector)
  // @param size - size in pixels (vector)
  // @param standing - if true, capsule will be standing. else, will lie down. (default: true)
  constructor(position, size, standing) {
    super();

    // default standing
    if (standing === undefined) standing = true;

    // create objects
    objects = [];
    if (standing) {
      size = size.clone();
      size.y -= size.x;
      objects.push(
        new SSCDRectangle(new SSCDVector(-size.x * 0.5, -size.y * 0.5), size)
      );
      objects.push(
        new SSCDCircle(new SSCDVector(0, -size.y * 0.5), size.x * 0.5)
      );
      objects.push(
        new SSCDCircle(new SSCDVector(0, size.y * 0.5), size.x * 0.5)
      );
    } else {
      size = size.clone();
      size.y -= size.x;
      objects.push(
        new SSCDRectangle(
          new SSCDVector(-size.y * 0.5, -size.x * 0.5),
          size.flip()
        )
      );
      objects.push(
        new SSCDCircle(new SSCDVector(-size.y * 0.5, 0), size.x * 0.5)
      );
      objects.push(
        new SSCDCircle(new SSCDVector(size.y * 0.5, 0), size.x * 0.5)
      );
    }

    // init composite shape
    this.__init_comp_shape(position, objects);

    this.__type = "capsule";
  }
}

module.exports = SSCDCapsule;
