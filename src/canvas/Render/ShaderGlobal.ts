export namespace ShaderGlobals {
	export enum Attributes {
		Position = "a_Position",
		UV = "a_UV",
		Transform = "a_Transformation",
	}

	export const a_Position = 0;
	export const a_UV = 1;
	export const a_Sprite = 1;
	export const a_Frame = 2;
	export const a_Transformation = 3;

	export const Location = {
		a_Position: 0,
		a_UV: 1,
	};
}
