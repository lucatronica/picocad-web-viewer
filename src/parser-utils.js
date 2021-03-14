
/**
 * @param {string} s
 * @param {string} sep
 * @returns {[string, string]}
 */
export function splitString(s, sep) {
	const i = s.indexOf(sep);
	return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + sep.length)];
}

/**
 * @param {string} s 
 * @returns {[string, string]}
 */
export function readLine(s) {
	let i = 0;
	let end = s.length;
	while (i < s.length) {
		const c = s.charAt(i);
		i++;
		if (c === "\n") {
			end = i - 1;
			break;
		} else if (c === "\r") {
			end = i - 1;
			if (s.charAt(i) === "\n") {
				i++;
			}
			break;
		}
	}

	return [s.slice(0, end), s.slice(i)];
}
