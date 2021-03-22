import { PICO_COLORS } from "./pico";

// Hex format as an image of pico8 colors, as array of indexes.
// Each group of 2x4 pixels represents the gradient for a given color.
// Top -> bottom = light -> dark.
// The two columns are for dithering: there may be two different colors for a given light level.
// (This is based directly off picoCAD's lighting).

/**
 * @param {number} w
 * @param {number} h
 * @param {string} hexData 
 * @returns {ImageData}
 */
function createImage(w, h, hexData) {
	const img = new ImageData(w, h);
	
	// init data
	const data = img.data;

	const n = w * h;
	let index = 0;
	for (let i = 0; i < n; i++) {
		const color = PICO_COLORS[parseInt(hexData.charAt(i), 16)];

		data[index    ] = color[0];
		data[index + 1] = color[1];
		data[index + 2] = color[2];
		data[index + 3] = 255;
		index += 4;
	}

	return img;
}

export function createTextureLightMap() {
	return createImage(32, 4, "00112233445566778899aabbccddeeff0010213542516d768294a9b3cdd5e8fe000011552211dd6622449933dd55889900000011110055dd1122445555112244");
}

export function createColorLightMap() {
	return createImage(32, 7, "00112233445566778899aabbccddeeff0011223542556d768894a9bbccddeefe001122552255dd66884499bbccddeeee001021512251d56d824294b3cdd5e8e800001111221155dd22224433dd55888800001010211151d521224235d551828200000000111111551122225555112222");
}
