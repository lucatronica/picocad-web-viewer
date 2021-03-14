
/**
 * @param {string} s 
 * @returns {LuaPicoCADModel}
 */
export function parsePicoCADData(s) {
	return /** @type {any} */(parseLua(s));
}

/**
 * @param {string} s 
 * @returns {LuaTable}
 */
function parseLua(s) {
	let i = 0;

	return readObject();

	function readValue() {
		const c = s.charAt(i);
		if (c === "{") {
			return readObject();
		} else if (c === "'") {
			return readString();
		} else if (c === "-" || c === "." || (c >= "0" && c <= "9")) {
			return readNumber();
		} else {
			throw Error("Unkown value (" + i + "): " + "\"" + c + "\" = " + c.charCodeAt(0));
		}
	}

	function readObject() {
		i++; // {

		const obj = {
			array: [],
			dict: Object.create(null),
		};

		skipWhitespace();
		
		while (true) {
			const c = s.charAt(i);

			if (c === "}") {
				i++;
				break;
			}

			let key;

			if (c >= "a" && c <= "z") {
				// key-value pair
				let start = i;
				i++;

				while (true) {
					const c = s.charAt(i);
					if (c === "=") {
						break;
					} else {
						i++;
					}
				}

				key = s.slice(start, i);
				i++; // =
			}

			const value = readValue();

			if (key == null) {
				obj.array.push(value);
			} else {
				obj.dict[key] = value;
			}

			skipWhitespace();

			const cc = s.charAt(i);

			if (cc === ",") {
				i++;
				skipWhitespace();
			}
		}

		return obj;
	}

	function readString() {
		// assuming no escapes
		const start = i;
		const j = s.indexOf("'", i + 1);
		if (j < 0) {
			throw Error("No end!!!");
		}
		i = j + 1;
		if (i === start) {
			throw Error("!!!!");
		}
		return s.slice(start + 1, j);
	}

	function readNumber() {
		const start = i;

		while (true) {
			const c = s.charAt(i);
			
			if (c === "-" || c === "." || (c >= "0" && c <= "9")) {
				i++;
			} else {
				break;
			}
		}

		if (i === start) {
			throw Error("!!!!");
		}

		return Number(s.slice(start, i));
	}

	function skipWhitespace() {
		while (true) {
			const c = s.charAt(i);

			if (c === " " || c === "\n" || c === "\r" || c === "\t") {
				i++;
			} else {
				break;
			}
		}
	}
}

/** @typedef {string | number | LuaTable} LuaValue */
/** @typedef {{array: LuaValue[], dict: Record<string, LuaValue>}} LuaTable */
/** @typedef {{array: T[], dict: Record<string, LuaValue>}} LuaArray<T> @template T */
/** @typedef {{array: LuaValue[], dict: T}} LuaDict<T> @template T */
/** @typedef {{array: T[], dict: U}} LuaArrayDict<T> @template T @template U */
/** @typedef {LuaArray<LuaDict<{name: string, pos: LuaArray<number>, rot: LuaArray<number>, v: LuaArray<LuaArray<number>>, f: LuaArray<LuaArrayDict<number, {c: number, dbl?: number, noshade?: number, notex?: number, prio?: number, uv: LuaArray<number>}>>}>>} LuaPicoCADModel */
