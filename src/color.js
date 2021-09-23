
/**
 * RGB255 to packed int.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number}
 */
export function rgbToInt(r, g, b) {
	return 0xff000000 + (b << 16) + (g << 8) + r;
}
