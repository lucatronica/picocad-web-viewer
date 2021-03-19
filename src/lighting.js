import { PICO_COLORS } from "./pico";

// 32x4 image of pico8 colors, as array of indexes.
// Each group of 2x4 pixels represents the gradient for a given color.
// Top -> bottom = light -> dark.
// The two columns are for dithering: there may be two different colors for a given light level.
// (This is based directly off picoCAD's lighting).
const DATA = "00112233445566778899aabbccddeeff0010213542516d768294a9b3cdd5e8fe000011552211dd6622449933dd55889900000011110055dd1122445555112244";

export const LIGHT_MAP_IMAGE = new ImageData(32, 4);

// init data
const data = LIGHT_MAP_IMAGE.data;

let index = 0;
for (let i = 0; i < 128; i++) {
	const color = PICO_COLORS[parseInt(DATA.charAt(i), 16)];

	data[index    ] = color[0];
	data[index + 1] = color[1];
	data[index + 2] = color[2];
	data[index + 3] = 255;
	index += 4;
}
