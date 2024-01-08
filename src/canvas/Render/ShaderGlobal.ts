export namespace ShaderGlobals {
	export enum Attributes {
		a_Position = "a_Position",
		a_UV = "a_UV",
		a_Normal = "a_Normal",
		a_Transform = "a_Transformation",
	}

	/**
	 * Default attributes
	 */
	export const a_Position = 0;
	export const a_UV = 1;
	export const a_Normal = 2;

	/**
	 * Spirte attributes
	 */
	export const a_Sprite = 1;
	export const a_Frame = 2;
	export const a_Transformation = 3;

	export const AllLocations = {
		a_Position,
		a_UV,
		a_Normal,
		a_Sprite,
		a_Frame,
		a_Transformation,
	};

	export const LocationSprite = {
		a_Position,
		a_Sprite,
		a_Frame,
		a_Transformation,
	};

	export const Location2D = {
		a_Position,
		a_UV,
	};

	export const Location3D = {
		a_Position,
		a_UV,
		a_Normal,
	};
}
