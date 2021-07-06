export namespace ShaderGlobal {
  export enum Attribute {
    Position = "a_Position",
    Normal = "a_Norm",
    UV = "a_UV",
  }

  export const Location = {
    [Attribute.Position]: 0,
    [Attribute.Normal]: 1,
    [Attribute.UV]: 2,
  };
}
