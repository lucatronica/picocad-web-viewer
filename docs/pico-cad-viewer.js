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
 * @returns {{data: ImageData, flags: boolean[], indices: number[]}} A 128x128 image, the  and a array of 16 booleans indicating if the give color is used in the model.
 */
function parsePicoCADTexture(s, alphaIndex) {
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

/**
 * A rendering pass.
 */
class Pass {
	/**
	 * @param {WebGLRenderingContext} gl
	 * @param {{cull?: boolean, lighting?: boolean, clearDepth?: boolean}} [options] 
	 */
	constructor(gl, options={}) {
		this.gl = gl;
		this.cull = options.cull ?? true;
		this.lighting = options.lighting ?? true;
		this.clearDepth = options.clearDepth ?? false;

		/** @type {number[]} */
		this.vertices = [];
		/** @type {number[]} */
		this.normals = [];
		/** @type {number[]} */
		this.uvs = [];
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
			this.uvBuffer = gl.createBuffer();
			this.triangleBuffer = gl.createBuffer();
			
			if (this.lighting) {
				this.normalBuffer = gl.createBuffer();
			}

			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.triangles), gl.STATIC_DRAW);
			
			if (this.lighting) {
				gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
			}
		}

		this.uvs = null;
		this.normals = null;
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
		gl.deleteBuffer(this.uvBuffer);
		gl.deleteBuffer(this.triangleBuffer);
		
		if (this.lighting) {
			gl.deleteBuffer(this.normalBuffer);
		}
	}
}

class WirePass {
	/**
	 * @param {WebGLRenderingContext} gl 
	 */
	constructor(gl) {
		this.gl = gl;

		/** @type {number[]} */
		this.vertices = [];
	}

	save() {
		const gl = this.gl;

		this.vertexCount = Math.floor(this.vertices.length / 3);

		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

		this.vertices = null;
	}

	free() {
		this.gl.deleteBuffer(this.vertexBuffer);
	}
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} source 
 * @param {number} tesselationCount Pass 0 to do no tesselation
 */
function loadPicoCADModel(gl, source, tesselationCount) {
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
	const { passes, faceCount, objectCount, wireframe } = loadModel(gl, data, tesselationCount + 1);

	// Read texture.
	const tex = parsePicoCADTexture(readLine(texStr)[1], alphaIndex);

	return {
		name: fileName,
		zoomLevel: bestZoom,
		backgroundIndex: bgIndex,
		alphaIndex: alphaIndex,
		passes: passes,
		wireframe: wireframe,
		texture: tex.data,
		textureFlags: tex.flags,
		textureIndices: tex.indices,
		faceCount: faceCount,
		objectCount: objectCount,
	};
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {import("./parser-data").LuaPicoCADModel} rawModel 
 * @param {number} tn Number of tessellations
 */
function loadModel(gl, rawModel, tn) {
	const pPriorityCullLit = new Pass(gl, { cull: true, lighting: true });
	const pPriorityCull = new Pass(gl, { cull: true, lighting: false });
	const pPriorityLit = new Pass(gl, { cull: false, lighting: true });
	const pPriority = new Pass(gl, { cull: false, lighting: false });
	const pCullLit = new Pass(gl, { cull: true, lighting: true, clearDepth: true });
	const pCull = new Pass(gl, { cull: true, lighting: false });
	const pLit = new Pass(gl, { cull: false, lighting: true });
	const p = new Pass(gl, { cull: false, lighting: false });

	const wireframePass = new WirePass(gl);
	const wireframeVertices = wireframePass.vertices;

	let faceCount = 0;

	for (const object of rawModel.array) {
		const pos = object.dict.pos.array;
		// const rot = object.dict.rot.array; // unused?

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
			const useShading = dict.noshade !== 1;
			const useTexture = dict.notex !== 1;
			const priority = dict.prio === 1;
			const rawUVs = dict.uv.array;

			// Configure pass based on face props
			let pass;
			if (priority) {
				if (doubleSided) {
					if (useShading) {
						pass = pPriorityLit;
					} else {
						pass = pPriority;
					}
				} else {
					if (useShading) {
						pass = pPriorityCullLit;
					} else {
						pass = pPriorityCull;
					}
				}
			} else {
				if (doubleSided) {
					if (useShading) {
						pass = pLit;
					} else {
						pass = p;
					}
				} else {
					if (useShading) {
						pass = pCullLit;
					} else {
						pass = pCull;
					}
				}
			}

			const vertices = pass.vertices;
			const triangles = pass.triangles;
			const normals = pass.normals;

			// Get current vertex index.
			const vertexIndex0 = Math.floor(vertices.length / 3);

			// Get faces vertices and uvs.
			// Save face edges to wireframe buffer.
			const faceVertices = [];
			const faceUVs = [];

			for (let i = 0; i < faceIndices.length; i++) {
				const vertex = rawVertices[faceIndices[i] - 1];
				const vertex2 = rawVertices[faceIndices[i === 0 ? faceIndices.length - 1 : i - 1] - 1];

				faceVertices.push(vertex);

				wireframeVertices.push(
					vertex[0], vertex[1], vertex[2],
					vertex2[0], vertex2[1], vertex2[2],
				);

				faceUVs.push([
					rawUVs[i * 2] / 16,
					rawUVs[i * 2 + 1] / 16,
				]);
			}

			// Calculate face normal (should be same for all triangles)
			const faceNormal = calculateFaceNormal(faceVertices);

			// Get triangles
			if (faceIndices.length === 4 && useTexture && tn > 1) {
				// Tesselate quad.
				const uvs = pass.uvs;

				const c0 = faceVertices[0];
				const c1 = faceVertices[1];
				const c2 = faceVertices[2];
				const c3 = faceVertices[3];

				const uv0 = faceUVs[0];
				const uv1 = faceUVs[1];
				const uv2 = faceUVs[2];
				const uv3 = faceUVs[3];

				for (let xi = 0; xi <= tn; xi++) {
					const xt = xi / tn;

					const p0 = [
						lerp(c0[0], c1[0], xt),
						lerp(c0[1], c1[1], xt),
						lerp(c0[2], c1[2], xt),
						lerp(uv0[0], uv1[0], xt),
						lerp(uv0[1], uv1[1], xt),
					];
					const p1 = [
						lerp(c3[0], c2[0], xt),
						lerp(c3[1], c2[1], xt),
						lerp(c3[2], c2[2], xt),
						lerp(uv3[0], uv2[0], xt),
						lerp(uv3[1], uv2[1], xt),
					];

					for (let yi = 0; yi <= tn; yi++) {
						const yt = yi / tn;

						vertices.push(
							lerp(p0[0], p1[0], yt),
							lerp(p0[1], p1[1], yt),
							lerp(p0[2], p1[2], yt),
						);
						uvs.push(
							lerp(p0[3], p1[3], yt),
							lerp(p0[4], p1[4], yt),
						);
						normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
					}
				}

				for (let xi = 0; xi < tn; xi++) {
					for (let yi = 0; yi < tn; yi++) {
						const dy = yi * (tn + 1);

						// add two triangles for each subdivided quad
						const n1 = vertexIndex0 + dy + xi + 1;
						const n2 = vertexIndex0 + dy + xi + tn + 1;
						triangles.push(
							// 1
							vertexIndex0 + dy + xi,
							n1,
							n2,
							// 2
							n2,
							n1,
							vertexIndex0 + dy + xi + tn + 2,
						);
					}
				}
			} else {
				// Save vertices used by this face.
				for (const vertex of faceVertices) {
					vertices.push(vertex[0], vertex[1], vertex[2]);

					normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
				}

				// Save UVs used by this face.
				const uvs = pass.uvs;

				if (useTexture) {
					for (const uv of faceUVs) {
						uvs.push(uv[0], uv[1]);
					}
				} else {
					// Use secret UV indices
					const u = 1/256 + colorIndex * (1/128);

					for (let i = 0; i < faceUVs.length; i++) {
						uvs.push(u, 1);
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
	}

	// Init and return passes.
	const passes = [
		pPriorityCullLit,
		pPriorityCull,
		pPriorityLit,
		pPriority,
		pCullLit,
		pCull,
		pLit,
		p,
	];

	for (const pass of passes) {
		pass.save();
	}

	wireframePass.save();

	return {
		passes: passes,
		wireframe: wireframePass,
		faceCount: faceCount,
		objectCount: rawModel.array.length,
	};
}

/**
 * @param {number} a 
 * @param {number} b 
 * @param {number} t 
 */
function lerp(a, b, t) {
	return a + (b - a) * t;
}

/**
 * @param {number[][]} vertices 
 */
function calculateFaceNormal(vertices) {
	for (let i = 0; i < vertices.length; i++) {
		const v0 = vertices[i];
		const v1 = vertices[(i + 1) % vertices.length];
		const v2 = vertices[(i + 2) % vertices.length];

		const d0 = [
			v0[0] - v1[0],
			v0[1] - v1[1],
			v0[2] - v1[2],
		];
		const d1 = [
			v1[0] - v2[0],
			v1[1] - v2[1],
			v1[2] - v2[2],
		];

		const c = cross(d1, d0);
		const len = length(c);
		if (len > 0) {
			return [
				c[0] / len,
				c[1] / len,
				c[2] / len,
			];
		}
	}

	// All edges are parallel (a line)... Just return any vector :)
	return [1, 0, 0];
}

/**
 * @param {number[]} a 
 * @param {number[]} b 
 */
 function cross(a, b) {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0],
	];
}

/**
 * @param {number[]} a 
 */
function length(a) {
	return Math.hypot(a[0], a[1], a[2]);
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

		gl.deleteShader(vs);
		gl.deleteShader(fs);

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			const msg = gl.getProgramInfoLog(this.program);
			gl.deleteProgram(this.program);
			throw Error("program compilation failed: " + msg);
		}

		this.vertexLocation = this.getAttribLocation("vertex");
		this.uvLocation = this.getAttribLocation("uv");
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
			throw Error(`${type === gl.FRAGMENT_SHADER ? "fragment" : "vertex"} shader compilation failed: ${msg}`);
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

	use() {
		this.gl.useProgram(this.program);
	}
	
	free() {
		this.gl.deleteProgram(this.program);
	}
}

// 32x4 image of pico8 colors, as array of indexes.
// Each group of 2x4 pixels represents the gradient for a given color.
// Top -> bottom = light -> dark.
// The two columns are for dithering: there may be two different colors for a given light level.
// (This is based directly off picoCAD's lighting).
const DATA = "00112233445566778899aabbccddeeff0010213542516d768294a9b3cdd5e8fe000011552211dd6622449933dd55889900000011110055dd1122445555112244";

const LIGHT_MAP_IMAGE = new ImageData(32, 4);

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

class PicoCADViewer {
	/**
	 * @param {object} [options]
	 * @param {HTMLCanvasElement} [options.canvas] The canvas to render to. If not provided one will be created.
	 * @param {number} [options.fov] The camera FOV (degrees). Defaults to 90;
	 * @param {boolean} [options.drawModel] If the model should be drawn. Defaults to true.
	 * @param {boolean} [options.drawWireframe] If the wireframe should be drawn. Defaults to false.
	 * @param {number[]} [options.wireframeColor] The wireframe color as [R, G, B] (each component [0, 1]). Defaults to white.
	 * @param {number[]} [options.wireframeXray] If the wireframe should be drawn "through" the model. Defaults to true.
	 * @param {number} [options.tesselationCount] Quads can be tessellated to reduce the effect of UV distortion. Pass 1 or less to do no tessellation. Defaults to 3.
	 */
	constructor(options={}) {
		this.canvas = options.canvas;
		if (this.canvas == null) {
			this.canvas = document.createElement("canvas");
		}

		/** The webGL rendering context. */
		const gl = this.gl = this.canvas.getContext("webgl", {
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

		/** If a model has been loaded. @readonly */
		this.loaded = false;
		/** Information about the current model. @readonly @type {{name: string, backgroundIndex: number, zoomLevel: number, backgroundColor: number[], alphaIndex: number, alphaColor: number[], texture: ImageData, textureColorFlags: boolean[]}} */
		this.model = null;

		/** If the model should be drawn. */
		this.drawModel = options.drawModel ?? true;
		/** If the wireframe should be drawn. */
		this.drawWireframe = options.drawWireframe ?? false;
		/** If the wireframe should be drawn "through" the model. */
		this.wireframeXray = options.wireframeXray ?? true;
		/** The wireframe color as [R, G, B] (each component [0, 1]). */
		this.wireframeColor = options.wireframeColor ?? [1, 1, 1];
		/** Quads can be tessellated to reduce the effect of UV distortion. Pass 0 to do no tessellation. */
		this.tesselationCount = options.tesselationCount ?? 3;

		/** The lighting direction. Does not have to be normalized. */
		this.lightDirection = {
			x: 1,
			y: 0.5,
			z: 0,
		};

		/** @private @type {Pass[]} */
		this._passes = [];
		/** @private @type {WebGLTexture} */
		this._mainTex = null;
		/** @private @type {WebGLTexture} */
		this._indexTex = null;
		/** @private */
		this._lightMapTex = this._createTexture(null, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, LIGHT_MAP_IMAGE);
		/** @private */
		this._programTexture = createTextureProgram(gl);
		/** @private */
		this._programUnlitTexture = createUnlitTextureProgram(gl);
		/** @private @type {WirePass} */
		this._wireframe = null;
		/** @private */
		this._programWireframe = createWireframeProgram(gl);

		// Init GL.
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
	}

	/**
	 * @private
	 * @param {WebGLTexture} tex 
	 * @param {number} internalFormat 
	 * @param {number} format 
	 * @param {number} type 
	 * @param {TexImageSource|ArrayBufferView} source
	 * @param {number} [width]
	 * @param {number} [height]
	 */
	_createTexture(tex, internalFormat, format, type, source, width, height) {
		const gl = this.gl;

		if (tex == null) {
			tex = gl.createTexture();
		}

		gl.bindTexture(gl.TEXTURE_2D, tex);

		if (width == null) {
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				internalFormat,
				format,
				type,
				/** @type {TexImageSource} */(source)
			);
		} else {
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				internalFormat,
				width,
				height,
				0,
				format,
				type,
				/** @type {ArrayBufferView} */(source)
			);
		}
		
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		return tex;
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

		// Free old model resources.
		if (this.loaded) {
			for (const pass of this._passes) {
				pass.free();
			}
			this._passes = [];

			this._wireframe.free();

			gl.deleteTexture(this._mainTex);
			this._mainTex = null;

			gl.deleteTexture(this._indexTex);
			this._indexTex = null;
		}

		this.loaded = false;

		// Load the model.
		const model = loadPicoCADModel(this.gl, source, this.tesselationCount);

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
		this._wireframe = model.wireframe;

		// Upload GL textures.
		this._mainTex = this._createTexture(this._mainTex, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, model.texture);
		this._indexTex = this._createTexture(this._indexTex, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(model.textureIndices), 128, 128);

		// Done :)
		this.loaded = true;
	}

	/**
	 * Draw the scene once.
	 */
	draw() {
		if (!this.loaded || (!this.drawModel && !this.drawWireframe)) {
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

		// Setup lighting
		const lightVector = normalized(this.lightDirection);

		// Draw model
		if (this.drawModel) {
			// Render each pass
			for (const pass of this._passes) {
				if (pass.clearDepth) {
					gl.clear(gl.DEPTH_BUFFER_BIT);
				}

				if (pass.isEmpty()) {
					continue;
				}

				const programInfo = pass.lighting ? this._programTexture : this._programUnlitTexture;

				programInfo.program.use();

				// Uniforms
				gl.uniformMatrix4fv(
					programInfo.program.mvpLocation,
					false,
					mat,
				);

				// Vertex and UV attrib
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

				gl.bindBuffer(gl.ARRAY_BUFFER, pass.uvBuffer);
				gl.vertexAttribPointer(
					programInfo.program.uvLocation,
					2,
					gl.FLOAT,
					false,
					0,
					0,
				);
				gl.enableVertexAttribArray(programInfo.program.uvLocation);

				// Shader specific data
				if (programInfo === this._programUnlitTexture) {
					// Main texture
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, this._mainTex);
					gl.uniform1i(programInfo.locations.mainTex, 0);
				} else if (programInfo === this._programTexture) {
					// Index texture
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, this._indexTex);
					gl.uniform1i(programInfo.locations.indexTex, 0);

					// Light-map texture
					gl.activeTexture(gl.TEXTURE1);
					gl.bindTexture(gl.TEXTURE_2D, this._lightMapTex);
					gl.uniform1i(programInfo.locations.lightMap, 1);

					// Light direction
					gl.uniform3f(programInfo.locations.lightDir, lightVector.x, lightVector.y, lightVector.z);

					// Normal attrib
					gl.bindBuffer(gl.ARRAY_BUFFER, pass.normalBuffer);
					gl.vertexAttribPointer(
						programInfo.locations.normal,
						3,
						gl.FLOAT,
						false,
						0,
						0,
					);
					gl.enableVertexAttribArray(programInfo.locations.normal);
				}

				// Configure culling
				if (pass.cull) {
					gl.enable(gl.CULL_FACE);
				} else {
					gl.disable(gl.CULL_FACE);
				}

				// Draw!
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pass.triangleBuffer);

				gl.drawElements(gl.TRIANGLES, pass.vertexCount, gl.UNSIGNED_SHORT, 0);

				// Clean up attributes
				gl.disableVertexAttribArray(programInfo.program.vertexLocation);
				gl.disableVertexAttribArray(programInfo.program.uvLocation);
				
				if (programInfo === this._programTexture) {
					gl.disableVertexAttribArray(programInfo.locations.normal);
				}
			}
		}

		// Draw wireframe
		if (this.drawWireframe) {
			if (this.drawModel && this.wireframeXray) {
				gl.clear(gl.DEPTH_BUFFER_BIT);
			}

			this._programWireframe.program.use();

			// Uniforms
			gl.uniformMatrix4fv(
				this._programWireframe.program.mvpLocation,
				false,
				mat,
			);

			gl.uniform4fv(
				this._programWireframe.locations.color,
				[
					this.wireframeColor[0],
					this.wireframeColor[1],
					this.wireframeColor[2],
					1
				],
			);

			// Bind vertex data
			gl.bindBuffer(gl.ARRAY_BUFFER, this._wireframe.vertexBuffer);
			gl.vertexAttribPointer(
				this._programWireframe.program.vertexLocation,
				3,
				gl.FLOAT,
				false,
				0,
				0,
			);
			gl.enableVertexAttribArray(this._programWireframe.program.vertexLocation);

			gl.drawArrays(gl.LINES, 0, this._wireframe.vertexCount);
		}

		// // Check if any errors occurred.
		// const error = gl.getError();
		// if (error !== 0) {
		// 	throw Error(
		// 		({
		// 			[gl.INVALID_ENUM]: "Invalid enum",
		// 			[gl.INVALID_VALUE]: "Invalid value",
		// 			[gl.INVALID_OPERATION]: "Invalid operation",
		// 			[gl.INVALID_FRAMEBUFFER_OPERATION]: "Invalid framebuffer operation",
		// 			[gl.OUT_OF_MEMORY]: "Out of memory",
		// 			[gl.CONTEXT_LOST_WEBGL]: "Lost context",
		// 		})[error] ?? "Unknown WebGL Error"
		// 	);
		// }
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
		return this._transformDirection(0, 0, -1);
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
	 * Set the camera rotation and position to look at the model a certain radius from the center.
	 * @param {number} radius 
	 * @param {number} spin The horizontal position (radians).
	 * @param {number} roll The vertical position (radians).
	 * @param {{x: number, y: number, z: number}} [center] Defaults to {x: 0, y: 1.5, z: 0}
	 */
	setTurntableCamera(radius, spin, roll, center={ x: 0, y: 1.5, z: 0}) {
		const a = Math.PI - spin;
		roll = -roll;

		this.cameraPosition = {
			x: radius * Math.cos(roll) * Math.sin(a) - center.x,
			y: radius * Math.sin(roll) - center.y,
			z: radius * Math.cos(roll) * Math.cos(a) - center.z,
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
		const gl = this.gl;
		
		this.stopDrawLoop();

		for (const pass of this._passes) {
			pass.free();
		}
		this._passes = [];

		gl.deleteTexture(this._lightMapTex);
		gl.deleteTexture(this._mainTex);
		gl.deleteTexture(this._indexTex);
		this._lightMapTex = null;
		this._mainTex = null;
		this._indexTex = null;

		this._programTexture.program.free();
		this._programWireframe.program.free();
		this._programTexture = null;
		this._programWireframe = null;
	}
}

/**
 * @param {WebGLRenderingContext} gl 
 */
 function createTextureProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;
		attribute vec3 normal;
		attribute vec2 uv;

		varying highp vec2 v_uv;
		varying highp vec3 v_normal;

		uniform mat4 mvp;

		void main() {
			v_normal = normal;
			v_uv = uv;
			gl_Position = mvp * vertex;
		}
	`, `
		varying highp vec2 v_uv;
		varying highp vec3 v_normal;
		
		uniform sampler2D indexTex;
		uniform sampler2D lightMap;
		uniform highp vec3 lightDir;

		void main() {
			highp float index = texture2D(indexTex, v_uv).r;
			if (index == 1.0) discard;
			highp float intensity = clamp(4.0 * abs(dot(v_normal, lightDir)) - 1.0, 0.0, 1.0);
			gl_FragColor = texture2D(lightMap, vec2(index * 15.9375 + mod(gl_FragCoord.x + gl_FragCoord.y, 2.0) * 0.03125, 1.0 - intensity));
		}
	`);
	
	return {
		program: program,
		locations: {
			uv: program.getAttribLocation("uv"),
			normal: program.getAttribLocation("normal"),
			indexTex: program.getUniformLocation("indexTex"),
			lightMap: program.getUniformLocation("lightMap"),
			lightDir: program.getUniformLocation("lightDir"),
		}
	};
}


/**
 * @param {WebGLRenderingContext} gl 
 */
 function createUnlitTextureProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;
		attribute vec2 uv;

		varying highp vec2 v_uv;

		uniform mat4 mvp;

		void main() {
			v_uv = uv;
			gl_Position = mvp * vertex;
		}
	`, `
		varying highp vec2 v_uv;
		
		uniform sampler2D mainTex;

		void main() {
			lowp vec4 color = texture2D(mainTex, v_uv);
			if (color.a == 0.0) discard;
			gl_FragColor = color;
		}
	`);
	
	return {
		program: program,
		locations: {
			mainTex: program.getUniformLocation("mainTex"),
		}
	};
}

/**
 * @param {WebGLRenderingContext} gl 
 */
 function createWireframeProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;

		uniform mat4 mvp;

		void main() {
			gl_Position = mvp * vertex;
		}
	`, `
		uniform lowp vec4 color;

		void main() {
			gl_FragColor = color;
		}
	`);
	
	return {
		program: program,
		locations: {
			color: program.getUniformLocation("color"),
		}
	};
}

/**
 * @param {{x: number, y: number, z: number}} vec 
 */
function normalized(vec) {
	let len = Math.hypot(vec.x, vec.y, vec.z);
	if (len === 0) len = 1;
	return {
		x: vec.x / len,
		y: vec.y / len,
		z: vec.z / len,
	};
}

export default PicoCADViewer;
export { PicoCADViewer };
