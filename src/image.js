import { PICO_COLORS } from "./pico";

/**
 * Creates an image from a string of hex indices.
 * @param {number} w
 * @param {number} h
 * @param {string} hexData 
 * @returns {ImageData}
 * @example
 * createP8Image(4, 4, "0123456789abcdef")  // Image that shows the 4x4 grid of PICO-8 colors.
 */
export function createP8Image(w, h, hexData) {
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
