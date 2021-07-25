export namespace pixi_compressed_textures {
  // headers
  const ASTC_HEADER_LENGTH = 16;
  // uint 8
  const ASTC_HEADER_DIM_X = 4;
  // uint 8
  const ASTC_HEADER_DIM_Y = 5;
  // uint 24
  const ASTC_HEADER_WIDTH = 7;
  //uint 24
  const ASTC_HEADER_HEIGHT = 10;

  const ASTC_MAGIC = 0x5ca1ab13;

  /* Compressed Texture Format */
  const COMPRESSED_RGBA_ASTC_4x4_KHR = 0x93b0;
  const COMPRESSED_RGBA_ASTC_5x4_KHR = 0x93b1;
  const COMPRESSED_RGBA_ASTC_5x5_KHR = 0x93b2;
  const COMPRESSED_RGBA_ASTC_6x5_KHR = 0x93b3;
  const COMPRESSED_RGBA_ASTC_6x6_KHR = 0x93b4;
  const COMPRESSED_RGBA_ASTC_8x5_KHR = 0x93b5;
  const COMPRESSED_RGBA_ASTC_8x6_KHR = 0x93b6;
  const COMPRESSED_RGBA_ASTC_8x8_KHR = 0x93b7;
  const COMPRESSED_RGBA_ASTC_10x5_KHR = 0x93b8;
  const COMPRESSED_RGBA_ASTC_10x6_KHR = 0x93b9;
  const COMPRESSED_RGBA_ASTC_10x8_KHR = 0x93ba;
  const COMPRESSED_RGBA_ASTC_10x10_KHR = 0x93bb;
  const COMPRESSED_RGBA_ASTC_12x10_KHR = 0x93bc;
  const COMPRESSED_RGBA_ASTC_12x12_KHR = 0x93bd;

  const COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR = 0x93d0;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR = 0x93d1;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR = 0x93d2;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR = 0x93d3;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR = 0x93d4;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR = 0x93d5;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR = 0x93d6;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR = 0x93d7;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR = 0x93d8;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR = 0x93d9;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR = 0x93da;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR = 0x93db;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR = 0x93dc;
  const COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR = 0x93dd;

  const ASTC_DIMS_TO_FORMAT = {
    [4 * 4]: 0,
    [5 * 4]: 1,
    [5 * 5]: 2,
    [6 * 5]: 3,
    [6 * 6]: 4,
    [8 * 5]: 5,
    [8 * 6]: 6,
    [8 * 8]: 7,
    [10 * 5]: 8,
    [10 * 6]: 9,
    [10 * 8]: 10,
    [10 * 10]: 11,
    [12 * 10]: 12,
    [12 * 12]: 13,
  };

  export class ASTCLoader {
    public static type = "ASTC";
    private _blockSize: { x: number; y: number } = { x: 0, y: 0 };

    static load(buffer: ArrayBuffer) {
      if (!ASTCLoader.test(buffer)) {
        // Do some sanity checks to make sure this is a valid ASTC file.
        throw "Invalid magic number in ASTC header";
      }

      const header = new Uint8Array(buffer, 0, ASTC_HEADER_LENGTH);
      const dim_x = header[ASTC_HEADER_DIM_X];
      const dim_y = header[ASTC_HEADER_DIM_Y];
      const width =
        header[ASTC_HEADER_WIDTH]! +
        (header[ASTC_HEADER_WIDTH + 1]! << 8) +
        (header[ASTC_HEADER_WIDTH + 2]! << 16);
      const height =
        header[ASTC_HEADER_HEIGHT]! +
        (header[ASTC_HEADER_HEIGHT + 1]! << 8) +
        (header[ASTC_HEADER_HEIGHT + 2]! << 16);
      const internalFormat =
        ASTC_DIMS_TO_FORMAT[dim_x! * dim_y!]! +
        (false
          ? COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR
          : COMPRESSED_RGBA_ASTC_4x4_KHR);
      const astcData = new Uint8Array(buffer, ASTC_HEADER_LENGTH);

      return {
        _blockSizeX: dim_x,
        _blockSizeY: dim_y,
        astcData,
        internalFormat,
        width,
        height,
      };
    }

    static test(buffer: ArrayBuffer) {
      const magic = new Int32Array(buffer, 0, 1);
      return magic[0] === ASTC_MAGIC;
    }

    levelBufferSize(
      width: number,
      height: number,
      mipLevel: number = 0
    ): number {
      const f_ = Math.floor;
      const dim_x = this._blockSize.x;
      const dim_y = this._blockSize.y;

      return (
        (f_((width + dim_x - 1) / dim_x) * f_((height + dim_y - 1) / dim_y)) <<
        4
      );
    }
  }
}
