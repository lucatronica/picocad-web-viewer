/**
 * Common utilities
 * @module glMatrix
 */
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$1() {
  var out = new ARRAY_TYPE(16);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Generates a perspective projection matrix with the given bounds.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */

function perspective(out, fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2),
      nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }

  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */

function set(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateX(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0];
  r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
  r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateY(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateZ(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
  r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
  r[2] = p[2]; //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Set the components of a vec3 to zero
 *
 * @param {vec3} out the receiving vector
 * @returns {vec3} out
 */

function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  return out;
}
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

/**
 * @param {string} s 
 * @returns {LuaPicoCADModel}
 */
function parsePicoCADData(s) {
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

/**
 * @param {string} s
 * @param {string} sep
 * @returns {[string, string]}
 */
function splitString(s, sep) {
	const i = s.indexOf(sep);
	return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + sep.length)];
}

/**
 * @param {string} s 
 * @returns {[string, string]}
 */
function readLine(s) {
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

const PICO_COLORS = [
	[0, 0, 0],
	[29, 43, 83],
	[126, 37, 83],
	[0, 135, 81],
	[171, 82, 54],
	[95, 87, 79],
	[194, 195, 199],
	[255, 241, 232],
	[255, 0, 77],
	[255, 163, 0],
	[255, 236, 39],
	[0, 228, 54],
	[41, 173, 255],
	[131, 118, 156],
	[255, 119, 168],
	[255, 204, 170],
];

/**
 * @param {string} s 
 * @param {number} alphaIndex
 * @returns {{data: ImageData, flags: boolean[]}} A 128x128 image, and a array of 16 booleans indicating if the give color is used in the model.
 */
function parsePicoCADTexture(s, alphaIndex) {
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

			if (index === alphaIndex) ; else {
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

/**
 * A rendering pass.
 */
class Pass {
	/**
	 * @param {WebGLRenderingContext} gl
	 * @param {{cull?: boolean, useTexture?: boolean, clearDepth?: boolean}} [options] 
	 */
	constructor(gl, options={}) {
		this.gl = gl;
		this.cull = options.cull ?? true;
		this.useTexture = options.useTexture ?? true;
		this.clearDepth = options.clearDepth ?? false;

		/** @type {number[]} */
		this.vertices = [];
		/** @type {number[]} */
		this.uvs = [];
		/** @type {number[]} */
		this.colors = [];
		/** @type {number[]} */
		this.triangles = [];
	}

	/**
	 * Upload changes to the GL context.
	 */
	save() {
		const gl = this.gl;

		this.vertexCount = this.triangles.length;

		if (!this.isEmpty()) {
			this.vertexBuffer = gl.createBuffer();
			this.triangleBuffer = gl.createBuffer();

			if (this.useTexture) {
				this.uvBuffer = gl.createBuffer();
			} else {
				this.colorBuffer = gl.createBuffer();
			}

			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.triangles), gl.STATIC_DRAW);
			
			if (this.useTexture) {
				gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);
			} else {
				gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);
			}
		}

		this.uvs = null;
		this.colors = null;
		this.vertices = null;
		this.triangles = null;
	}

	/**
	 * If there is nothing to render.
	 */
	isEmpty() {
		return this.vertexCount === 0;
	}

	free() {
		const gl = this.gl;

		gl.deleteBuffer(this.vertexBuffer);
		gl.deleteBuffer(this.triangleBuffer);

		if (this.useTexture) {
			gl.deleteBuffer(this.uvBuffer);
		} else {
			gl.deleteBuffer(this.colorBuffer);
		}
	}
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} source 
 */
function loadPicoCADModel(gl, source) {
	if (!source.startsWith("picocad;")) {
		throw Error("Not a picoCAD file.");
	}

	// Read header.
	const [header, body] = readLine(source);

	const headerValues = header.split(";");
	const fileName = headerValues[1];
	const [bestZoom, bgIndex, alphaIndex] = headerValues.slice(2).map(s => Number(s));

	const [dataStr, texStr] = splitString(body, "%"); 

	// Read data.
	const data = parsePicoCADData(dataStr);
	const { passes, faceCount, objectCount } = loadModel(gl, data);

	// Read texture.
	const tex = parsePicoCADTexture(readLine(texStr)[1], alphaIndex);

	return {
		name: fileName,
		zoomLevel: bestZoom,
		backgroundIndex: bgIndex,
		alphaIndex: alphaIndex,
		passes: passes,
		texture: tex.data,
		textureFlags: tex.flags,
		faceCount: faceCount,
		objectCount: objectCount,
	};
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {import("./parser-data").LuaPicoCADModel} rawModel 
 */
function loadModel(gl, rawModel) {
	const pPriorityCullTexture = new Pass(gl, { cull: true, useTexture: true });
	const pPriorityCull = new Pass(gl, { cull: true, useTexture: false });
	const pPriorityTexture = new Pass(gl, { cull: false, useTexture: true });
	const pPriority = new Pass(gl, { cull: false, useTexture: false });
	const pCullTexture = new Pass(gl, { cull: true, useTexture: true, clearDepth: true });
	const pCull = new Pass(gl, { cull: true, useTexture: false });
	const pTexture = new Pass(gl, { cull: false, useTexture: true });
	const p = new Pass(gl, { cull: false, useTexture: false });

	let faceCount = 0;

	for (const object of rawModel.array) {
		const pos = object.dict.pos.array;
		object.dict.rot.array;

		const rawVertices = object.dict.v.array.map(la => {
			const xs = la.array;
			return [
				-xs[0] - pos[0],
				-xs[1] - pos[1],
				xs[2] + pos[2],
			];
		});
		
		// pioCAD stores each vertex once.
		// But we'll have to duplicate vertices across faces!

		for (const face of object.dict.f.array) {
			faceCount++;
			const faceIndices = face.array;
			const dict = face.dict;

			const colorIndex = dict.c;
			const doubleSided = dict.dbl === 1;
			dict.noshade !== 1;
			const useTexture = dict.notex !== 1;
			const priority = dict.prio === 1;
			const rawUVs = dict.uv.array;

			// Configure pass based on face props
			let pass;
			if (priority) {
				if (doubleSided) {
					if (useTexture) {
						pass = pPriorityTexture;
					} else {
						pass = pPriority;
					}
				} else {
					if (useTexture) {
						pass = pPriorityCullTexture;
					} else {
						pass = pPriorityCull;
					}
				}
			} else {
				if (doubleSided) {
					if (useTexture) {
						pass = pTexture;
					} else {
						pass = p;
					}
				} else {
					if (useTexture) {
						pass = pCullTexture;
					} else {
						pass = pCull;
					}
				}
			}

			const vertices = pass.vertices;
			const triangles = pass.triangles;

			// Save current vertex index.
			const vertexIndex0 = Math.floor(vertices.length / 3);

			// Save vertices used by this face.
			for (let i = 0; i < faceIndices.length; i++) {
				const vertex = rawVertices[faceIndices[i] - 1];
				vertices.push(vertex[0], vertex[1], vertex[2]);
			}

			if (pass.useTexture) {
				// Save UVs used by this face.
				const uvs = pass.uvs;
			
				for (let i = 0; i < faceIndices.length; i++) {
					uvs.push(
						rawUVs[i * 2] / 16,
						rawUVs[i * 2 + 1] / 16,
					);
				}
			} else {
				// Save color for each vertex
				const colors = pass.colors;
				const rgbColor = PICO_COLORS[colorIndex];
				const glColor = [rgbColor[0] / 255, rgbColor[1] / 255, rgbColor[2] / 255];

				for (let i = 0; i < faceIndices.length; i++) {
					colors.push(glColor[0], glColor[1], glColor[2], 1);
				}
			}

			// Triangulate polygon.
			// This just uses fan triangulation :)
			for (let i = 0, n = faceIndices.length - 2; i < n; i++) {
				triangles.push(
					vertexIndex0 + 1 + i,
					vertexIndex0,
					vertexIndex0 + 2 + i,
				);
			}
		}
	}

	// Init and return pases.
	const passes = [
		pPriorityCullTexture,
		pPriorityCull,
		pPriorityTexture,
		pPriority,
		pCullTexture,
		pCull,
		pTexture,
		p,
	];

	for (const pass of passes) {
		pass.save();
	}

	return {
		passes: passes,
		faceCount: faceCount,
		objectCount: rawModel.array.length,
	};
}

class ShaderProgram {
	/**
	 * @param {WebGLRenderingContext} gl
	 * @param {string} vertexShader 
	 * @param {string} fragmentShader 
	 */
	constructor(gl, vertexShader, fragmentShader) {
		this.gl = gl;

		// create shaders
		const vs = this.createShader(gl.VERTEX_SHADER, vertexShader);
		const fs = this.createShader(gl.FRAGMENT_SHADER, fragmentShader);

		this.program = gl.createProgram();
		gl.attachShader(this.program, vs);
		gl.attachShader(this.program, fs);
		gl.linkProgram(this.program);

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			const msg = gl.getProgramInfoLog(this.program);
			gl.deleteProgram(this.program);
			throw msg;
		}

		this.vertexLocation = this.getAttribLocation("vertex");
		this.mvpLocation = this.getUniformLocation("mvp");
	}

	/**
	 * @param {number} type 
	 * @param {string} source 
	 */
	createShader(type, source) {
		const gl = this.gl;

		const shader = gl.createShader(type);

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const msg = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw msg;
		}

		return shader;
	}

	/**
	 * @param {string} name 
	 */
	getAttribLocation(name) {
		return this.gl.getAttribLocation(this.program, name);
	}
	
	/**
	 * @param {string} name 
	 */
	getUniformLocation(name) {
		return this.gl.getUniformLocation(this.program, name);
	}
}

class PicoCADViewer {
	/**
	 * @param {object} [options]
	 * @param {HTMLCanvasElement} [options.canvas] The canvas to render to. If not provided one will be created.
	 * @param {number} [options.fov] The camera FOV. Defaults to 90;
	 */
	constructor(options={}) {
		this.canvas = options.canvas;
		if (this.canvas == null) {
			this.canvas = document.createElement("canvas");
		}

		/** The webGL rendering context. */
		this.gl = this.canvas.getContext("webgl", {
			antialias: false,
		});
		
		/** Camera position in scene. */
		this.cameraPosition = {
			x: 0,
			y: 0,
			z: 0,
		};

		/** Camera rotation as Euler angles (radians). */
		this.cameraRotation = {
			x: 0,
			y: 0,
			z: 0,
		};

		/** The camera field-of-view in degrees. */
		this.cameraFOV = options.fov ?? 90;

		/** If a model has been loaded. */
		this.loaded = false;
		/** Information about the current model. @type {{name: string, backgroundIndex: number, zoomLevel: number, backgroundColor: number[], alphaIndex: number, alphaColor: number[], texture: ImageData, textureColorFlags: boolean[]}} */
		this.model = null;

		/** @private @type {Pass[]} */
		this._passes = [];
		/** @private @type {WebGLTexture} */
		this._mainTex = null;
		/** @private */
		this._programColor = createColorProgram(this.gl);
		/** @private */
		this._programTexture = createTextureProgram(this.gl);

		// Init GL.
		const gl = this.gl;

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
	}

	/**
	 * Load a picoCAD model.
	 * @param {Blob|string|URL} model The string can be a file's contents or a URL to a file.
	 * @returns The model name.
	 */
	async load(model) {
		if (typeof model === "string") {
			if (model.startsWith("picocad;")) {
				this._loadString(model);
			} else if (model.startsWith("http:") || model.startsWith("https:")) {
				await this._loadUrl(model);
			} else {
				throw Error(`Invalid string/url: ${model.slice(0, 50)}`);
			}
		} else if (model instanceof URL) {
			await this._loadUrl(model);
		} else if (model instanceof Blob) {
			await this._loadBlob(model);
		} else {
			throw TypeError();
		}

		return this.model.name;
	}

	/**
	 * @private
	 * @param {string | URL} url 
	 */
	async _loadUrl(url) {
		const response = await fetch(String(url));

		if (response.ok) {
			this._loadString(await response.text());
		} else {
			throw Error(`${response.status}: ${response.statusText}`);
		}
	}
	
	/**
	 * @private
	 * @param {Blob} blob 
	 */
	_loadBlob(blob) {
		return new Promise((resolve, reject) => {
			if (!blob.type.startsWith("text")) {
				throw Error("picoCAD file must be a text file");
			}
	
			const fr = new FileReader();
			fr.onload = () => {
				resolve(this._loadString(/** @type {string} */(fr.result)));
			};
			fr.onerror = () => {
				reject(fr.error);
			};
			fr.readAsText(blob);
		});
	}

	/**
	 * @private
	 * @param {string} source
	 */
	_loadString(source) {
		const gl = this.gl;

		// Free old resources.
		this.loaded = false;
		for (const pass of this._passes) {
			pass.free();
		}

		// Load the model.
		const model = loadPicoCADModel(this.gl, source);

		this.model = {
			name: model.name,
			zoomLevel: model.zoomLevel,
			backgroundIndex: model.backgroundIndex,
			backgroundColor: PICO_COLORS[model.backgroundIndex],
			alphaIndex: model.alphaIndex,
			alphaColor: PICO_COLORS[model.alphaIndex],
			texture: model.texture,
			textureColorFlags: model.textureFlags,
			faceCount: model.faceCount,
			objectCount: model.objectCount,
		};
		this._passes = model.passes;

		// Upload GL texture.
		if (this._mainTex == null) {
			this._mainTex = gl.createTexture();
		}
		gl.bindTexture(gl.TEXTURE_2D, this._mainTex);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			model.texture
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		// Done :)
		this.loaded = true;
	}

	/**
	 * Draw the scene once.
	 */
	draw() {
		if (!this.loaded) {
			return;
		}

		const gl = this.gl;

		// Set viewport.
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		// Clear screen.
		const bgColor = this.model.backgroundColor;

		gl.clearColor(bgColor[0] / 255, bgColor[1] / 255, bgColor[2] / 255, 1);
		gl.clearDepth(1.0); 
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Setup camera
		const mat = create$1();
		perspective(
			mat,
			this.cameraFOV * Math.PI / 180,
			this.canvas.width / this.canvas.height,
			0.1,
			400,
		);
		rotateX$1(mat, mat, this.cameraRotation.x);
		rotateY$1(mat, mat, this.cameraRotation.y);
		rotateZ$1(mat, mat, this.cameraRotation.z);
		translate(mat, mat, [ this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z ]);

		// Render each pass
		for (const pass of this._passes) {
			if (pass.clearDepth) {
				gl.clear(gl.DEPTH_BUFFER_BIT);
			}

			if (pass.isEmpty()) {
				continue;
			}

			const programInfo = pass.useTexture ? this._programTexture : this._programColor;

			gl.useProgram(programInfo.program.program);

			// Uniforms
			gl.uniformMatrix4fv(
				programInfo.program.mvpLocation,
				false,
				mat,
			);
	
			if (programInfo === this._programTexture) {
				// Main texture
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, this._mainTex);
				gl.uniform1i(this._programTexture.locations.mainTex, 0);

				// UV attrib
				gl.bindBuffer(gl.ARRAY_BUFFER, pass.uvBuffer);
				gl.vertexAttribPointer(
					this._programTexture.locations.uv,
					2,
					gl.FLOAT,
					false,
					0,
					0,
				);
				gl.enableVertexAttribArray(this._programTexture.locations.uv);
			} else if (programInfo === this._programColor) {
				// Color attrib
				gl.bindBuffer(gl.ARRAY_BUFFER, pass.colorBuffer);
				gl.vertexAttribPointer(
					this._programColor.locations.color,
					4,
					gl.FLOAT,
					false,
					0,
					0,
				);
				gl.enableVertexAttribArray(this._programColor.locations.color);
			}

			// Bind vertex data
			gl.bindBuffer(gl.ARRAY_BUFFER, pass.vertexBuffer);
			gl.vertexAttribPointer(
				programInfo.program.vertexLocation,
				3,
				gl.FLOAT,
				false,
				0,
				0,
			);
			gl.enableVertexAttribArray(programInfo.program.vertexLocation);

			// Conifgure culling
			if (pass.cull) {
				gl.enable(gl.CULL_FACE);
			} else {
				gl.disable(gl.CULL_FACE);
			}

			// Draw!
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pass.triangleBuffer);

			gl.drawElements(gl.TRIANGLES, pass.vertexCount, gl.UNSIGNED_SHORT, 0);
		}
	}

	/**
	 * @param {(dt: number) => void} [callback] Called before the start of every draw. `dt` is the seconds since last draw.
	 */
	startDrawLoop(callback) {
		let then = performance.now();
		const loop = () => {
			if (callback != null) {
				const now = performance.now();
				const dt = (now - then) / 1000;
				callback(dt);
				then = now;
			}

			this.draw();

			/** @private */
			this._rafID = requestAnimationFrame(loop);
		};
		loop();
	}

	stopDrawLoop() {
		if (this._rafID != null) {
			cancelAnimationFrame(this._rafID);
		}
	}

	getCameraRight() {
		return this._transformDirection(1, 0, 0);
	}
	getCameraUp() {
		return this._transformDirection(0, -1, 0);
	}
	getCameraForward() {
		return this._transformDirection(0, 0, 1);
	}

	/**
	 * The number of colors used in the texture.
	 * (There may more used by face colors.)
	 */
	getTextureColorCount(includeAlpha=false) {
		let count = 0;
		for (let i = 0; i < 16; i++) {
			if ((includeAlpha || i !== this.model.alphaIndex) && this.model.textureColorFlags[i]) {
				count++;
			}
		}
		return count;
	}

	getTriangleCount() {
		let count = 0;
		for (const pass of this._passes) {
			count += Math.floor(pass.vertexCount / 3);
		}
		return count;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {{x: number, y: number, z: number}}
	 * @private
	 */
	_transformDirection(x, y, z) {
		const vec = create();
		set(vec, x, y, z);

		const zero$1 = zero(create());

		rotateX(vec, vec, zero$1, Math.PI + this.cameraRotation.x);
		rotateY(vec, vec, zero$1, this.cameraRotation.y);
		rotateZ(vec, vec, zero$1, Math.PI + this.cameraRotation.z);

		return {
			x: vec[0],
			y: vec[1],
			z: vec[2],
		};
	}

	/**
	 * Set the camera rotation and position to look at the model a certain radius from the ceter.
	 * @param {number} radius 
	 * @param {number} y The base y position
	 * @param {number} spin The horizontal position (radians).
	 * @param {number} roll The vertical position (radians).
	 */
	setTurntableCamera(radius, y, spin, roll) {
		const a = Math.PI - spin;
		roll = -roll;

		this.cameraPosition = {
			x: radius * Math.cos(roll) * Math.sin(a),
			y: radius * Math.sin(roll) - y,
			z: radius * Math.cos(roll) * Math.cos(a),
		};
		this.cameraRotation = {
			y: spin,
			x: -roll,
			z: 0,
		};
	}

	/**
	 * Frees resources used by this viewer.
	 */
	free() {
		this.stopDrawLoop();

		for (const pass of this._passes) {
			pass.free();
		}
		this._passes = [];

		this.gl.deleteTexture(this._mainTex);
		this.gl = null;

		this.gl.deleteProgram(this._programColor.program);
		this.gl.deleteProgram(this._programTexture.program);
		this._programColor = null;
		this._programTexture = null;
	}
}

/**
 * @param {WebGLRenderingContext} gl 
 */
 function createTextureProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;
		attribute vec2 uv;

		varying highp vec2 fuv;

		uniform mat4 mvp;

		void main() {
			fuv = uv;
			gl_Position = mvp * vertex;
		}
	`, `
		varying highp vec2 fuv;
		
		uniform sampler2D mainTex;

		void main() {
			highp vec4 col = texture2D(mainTex, fuv);
			if (col.a == float(0)) discard;
			gl_FragColor = col;
		}
	`);
	
	return {
		program: program,
		locations: {
			uv: program.getAttribLocation("uv"),
			mainTex: program.getUniformLocation("mainTex"),
		}
	};
}

/**
 * @param {WebGLRenderingContext} gl 
 */
function createColorProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;
		attribute vec4 col;

		varying lowp vec4 fcol;

		uniform mat4 mvp;

		void main() {
			fcol = col;
			gl_Position = mvp * vertex;
		}
	`, `
		varying lowp vec4 fcol;

		void main() {
			gl_FragColor = fcol;
		}
	`);
	
	return {
		program: program,
		locations: {
			color: program.getAttribLocation("col"),
		}
	};
}

export default PicoCADViewer;
export { PicoCADViewer };
