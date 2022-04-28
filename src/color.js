
/**
 * @param {number} x
 * @param {number} n
 * @returns {number}
 */
function leftShift(x, n) {
	for (let i = 0; i < n; i++) {
		x *= 2;
	}
	return x;
}

/**
 * RGB255 to packed int.
 * @param {number[]} rgb
 * @returns {number}
 */
export function rgbToInt(rgb) {
	// Need to do alpha left shift manually to prevent overflow
	return (rgb.length < 4 ? 0xff000000 : leftShift(rgb[3], 24)) + (rgb[2] << 16) + (rgb[1] << 8) + rgb[0];
}

/**
 * @param {number[]} rgb RGB or RGBA
 * @returns {number[]}
 */
export function rgb255To01(rgb) {
	return rgb.map(a => a / 255);
}

/**
 * @param {number[]} rgb RGB or RGBA
 * @returns {number[]}
 */
export function rgb01to255(rgb) {
	return rgb.map(a => Math.floor(a * 255.999));
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function luma(r, g, b) {
	return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
