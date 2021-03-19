import { readLine } from "./parser-utils";
import { PICO_COLORS } from "./pico";

/**
 * @param {string} s 
 * @param {number} alphaIndex
 * @returns {{data: ImageData, flags: boolean[], indices: number[]}} A 128x128 image, the  and a array of 16 booleans indicating if the give color is used in the model.
 */
export function parsePicoCADTexture(s, alphaIndex) {
	const imgData = new ImageData(128, 128);
	const data = imgData.data;
	const indexArray = /** @type {number[]} */(Array(16384)).fill(255);
	const flags = /** @type {boolean[]} */(Array(16).fill(false));

	let i = 0;
	let ti = 0;
	let line;
	for (let y = 0; y < 120; y++) {
		[line, s] = readLine(s);

		for (let x = 0; x < 128; x++) {
			const index = Number.parseInt(line.charAt(x), 16);
			
			flags[index] = true;

			if (index === alphaIndex) {
				// this is transparent
				indexArray[i] = 255;
			} else {
				indexArray[i] = index;

				const rgb = PICO_COLORS[index];

				data[ti    ] = rgb[0];
				data[ti + 1] = rgb[1];
				data[ti + 2] = rgb[2];
				data[ti + 3] = 255;
			}

			i++;
			ti += 4;
		}
	}

	// Add hidden indices on bottom row for single color faces.
	for (let i = 0; i < 16; i++) {
		indexArray[16256 + i] = i;

		const rgb = PICO_COLORS[i];

		const ti = 65024 + i * 4;
		data[ti    ] = rgb[0];
		data[ti + 1] = rgb[1];
		data[ti + 2] = rgb[2];
		data[ti + 3] = 255;
	}

	return {
		data: imgData,
		indices: indexArray,
		flags: flags,
	};
}
