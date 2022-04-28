import { createP8Image } from "./image.js";

// Each group of 2x4 pixels represents the gradient for a given color.
// Top -> bottom = light -> dark.
// The two columns are for dithering: there may be two different colors for a given light level.
// (This is based directly off picoCAD's lighting).

export function createLightMap() {
	return createP8Image(32, 4, "00112233445566778899aabbccddeeff0010213542516d768294a9b3cdd5e8fe000011552211dd6622449933dd55889900000011110055dd1122445555112244");
}
