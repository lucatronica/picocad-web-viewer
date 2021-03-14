import { readLine } from "./parser-utils";
import { PICO_COLORS } from "./pico";

/**
 * @param {string} s 
 * @param {number} alphaIndex
 * @returns {{data: ImageData, flags: boolean[]}} A 128x128 image, and a array of 16 booleans indicating if the give color is used in the model.
 */
export function parsePicoCADTexture(s, alphaIndex) {
	const imgData = new ImageData(128, 128);
	const data = imgData.data;
	const flags = /** @type {boolean[]} */(Array(16).fill(false));

	let i = 0;
	let line;
	for (let y = 0; y < 120; y++) {
		[line, s] = readLine(s);

		for (let x = 0; x < 128; x++) {
			const index = Number.parseInt(line.charAt(x), 16);
			
			flags[index] = true;

			if (index === alphaIndex) {
				// this is transparent
			} else {
				const rgb = PICO_COLORS[index];

				data[i    ] = rgb[0];
				data[i + 1] = rgb[1];
				data[i + 2] = rgb[2];
				data[i + 3] = 255;
			}

			i += 4;
		}
	}

	return {
		data: imgData,
		flags: flags,
	};
}
