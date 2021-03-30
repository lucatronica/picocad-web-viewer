import { PicoCADModel, PicoCADModelFace, PicoCADModelObject } from "../src/model";
import * as LZW from "./lzw";


/**
 * @param {PicoCADModel} model 
 * @returns {string}
 */
export function urlCompressModel(model) {
	const bytes = modelToBytes(model);
	console.log("binary: " + bytes.length + " bytes");

	const lzw = LZW.compress(toByteString(bytes));

	const lzwBitstream = lzwNumbersToBitStream(lzw);

	let s = btoa(toByteString(lzwBitstream));

	// trim "=" from end
	let lastEq = s.indexOf("=", s.length - 4);
	if (lastEq >= 0) s = s.slice(0, lastEq);
	
	return s;
}

/**
 * @param {string} s
 * @returns {PicoCADModel}
 */
export function urlDecompressModel(s) {
	const lzwBitstream = fromByteString(atob(s));

	const lzw = bitStreamToLZWNumbers(lzwBitstream);

	const bytes = fromByteString(LZW.decompress(lzw));

	return bytesToModel(bytes);
}

/**
 * @param {number[]} bytes 
 * @returns {string}
 */
function toByteString(bytes) {
	let s = "";
	for (const byte of bytes) {
		s += String.fromCharCode(byte);
	}
	return s;
}

/**
 * @param {string} s 
 * @returns {number[]}
 */
function fromByteString(s) {
	const bytes = Array(s.length);
	for (let i = 0; i < s.length; i++) {
		bytes[i] = s.charCodeAt(i);
	}
	return bytes;
}


// Encoding/Decoding

const ENCODING_VERSION_1_0 = 1;

const ALPHABET = "\0abcdefghijklmnopqrstuvwxyz0123456789_ ";

const TEXTURE_ENCODING_RLE = 0;
const TEXTURE_ENCODING_PACKED = 1;

const uint16 = new Uint16Array(1);
const uint8 = new Uint8Array(uint16.buffer);

/**
 * @param {PicoCADModel} model 
 */
function modelToBytes(model) {
	// Utils
	/**
	 * @param {string} s
	 */
	function putPackedString(s) {
		s = s.toLowerCase();

		for (let i = 0; i < s.length; i++) {
			const n = ALPHABET.indexOf(s.charAt(i));
			if (n > 0) putPacked(n, 6);
		}

		putPacked(0, 6);
	}

	/**
	 * @param {number[]} xs
	 */
	function putFloats(xs) {
		for (const x of xs) {
			putFloat(x);
		}
	}

	/**
	 * @param {number} x 
	 */
	function putFloat(x) {
		const r = Math.round(x * 64) / 64;

		if (r >= -16 && r <= 15.75 && Number.isInteger(r * 4)) {
			bytes.push(192 + r * 4);
		} else {
			const n = 8192 + r * 64;
			if (n >= 32768) throw Error(`can't encode float "${x}"`);

			bytes.push((n & 65280) >> 8);
			bytes.push((n & 255));
		}
	}

	let packByte = 0;
	let packIndex = 0;

	function packEnd() {
		if (packIndex > 0) {
			bytes.push(packByte);
		}
		packByte = 0;
		packIndex = 0;
	}

	/**
	 * @param {number} x
	 * @param {number} bits Bits per integer
	 */
	function putPacked(x, bits) {
		for (let bit_i = 0; bit_i < bits; bit_i++) {
			const bit = 1 << bit_i;
			const b = (x & bit) >> bit_i;
			
			putPackedBit(b);
		}
	}

	/**
	 * @param {number} b 
	 */
	function putPackedBit(b) {
		packByte += b << packIndex;
		packIndex++;

		if (packIndex >= 8) {
			bytes.push(packByte);
			packIndex = 0;
			packByte = 0;
		}
	}


	// Start encoding.
	const bytes = /** @type {number[]} */([]);

	// Put encoding version (future proofing).
	bytes.push(ENCODING_VERSION_1_0);

	//Put model meta.
	putPackedString(model.name);

	putPacked(model.zoomLevel, 7);
	putPacked(model.backgroundIndex, 4);
	putPacked(model.alphaIndex, 4);

	packEnd();

	// Put object data.
	if (model.objects.length >= 256) throw Error("Too many objects");
	bytes.push(model.objects.length);

	for (const object of model.objects) {
		putPackedString(object.name);
		packEnd();
		putFloats(object.position);

		// Put vertices
		if (object.vertices.length >= 256) throw Error("Too many vertices on object");
		bytes.push(object.vertices.length);

		for (const vertex of object.vertices) {
			putFloats(vertex);
		}

		// Put faces
		const bpi = bitsToStore(object.vertices.length - 1);

		if (object.faces.length >= 256) throw Error("Too many faces on object");
		bytes.push(object.faces.length);

		for (const face of object.faces) {
			// Put face meta
			putPacked(face.colorIndex, 4);
			putPackedBit(face.texture ? 1 : 0);
			putPackedBit(face.shading ? 1 : 0);
			putPackedBit(face.doubleSided ? 1 : 0);
			putPackedBit(face.renderFirst ? 1 : 0);

			// We know the max index value based on the number of vertices.
			// So we can pack them more for smaller number of vertices.
			for (const index of face.indices) {
				putPacked(index, bpi);
			}
			putPacked(face.indices[0], bpi);

			// UVs are usually between -1 and 17, at a 0.25 resolution.
			// => ~72 possible values => 7bits per U/V value
			if (face.texture) {
				for (const uv of face.uvs) {
					putPacked(32 + uv[0] * 4, 7);
					putPacked(32 + uv[1] * 4, 7);
				}
			}
		}

		packEnd();
	}

	// Put texture data.
	let final_i = model.texture.length - 1;
	const finalIndex = model.texture[final_i];
	while (final_i >= 1) {
		if (model.texture[final_i - 1] === finalIndex) {
			final_i--;
		} else {
			break;
		}
	}

	/** @type {number[]} */
	const rleBytes = [];

	// generate 1byte per pixel w/ run length encoding
	for (let i = 0; i <= final_i; ) {
		const index = model.texture[i];
		let repeats = 0;

		i++;
		while (i <= final_i) {
			if (model.texture[i] === index) {
				i++;
				repeats++;
				if (repeats == 15) break;
			} else {
				break;
			}
		}

		rleBytes.push((index << 4) + repeats);
	}

	// Use run length encoding version if it's shorter!
	if (rleBytes.length < final_i / 2) {
		bytes.push(TEXTURE_ENCODING_RLE);

		for (const byte of rleBytes) {
			bytes.push(byte);
		}
	} else {
		// 4bits per pixel
		bytes.push(TEXTURE_ENCODING_PACKED);

		if (final_i % 2 == 0) final_i++;

		for (let i = 1; i <= final_i; i += 2) {
			bytes.push((model.texture[i - 1] << 4) + model.texture[i]);
		}
	}

	return bytes;
}


/**
 * @param {number[]} bytes 
 * @returns {PicoCADModel}
 */
 function bytesToModel(bytes) {
	// Utils
	function getPackedString() {
		let s = "";

		while (true) {
			const n = getPacked(6);
			if (n === 0) break;
			if (n >= ALPHABET.length) throw Error("invalid encoded string");
			s += ALPHABET.charAt(n);
		}

		return s;
	}

	/**
	 * @returns {number}
	 */
	function getByte() {
		if (byte_i < bytes.length) {
			return bytes[byte_i++];
		} else {
			throw Error("unexpected of input");
		}
	}
	
	/**
	 * @returns {number}
	 */
	function getOptionalByte() {
		if (byte_i < bytes.length) {
			return bytes[byte_i++];
		} else {
			return -1;
		}
	}

	/**
	 * @returns {number}
	 */
	function getFloat() {
		const b0 = getByte();

		if (b0 >= 128) {
			return ((b0 & 127) - 64) / 4;
		}
		
		const n = (b0 << 8) + getByte();

		return (n - 8192) / 64;
	}

	/**
	 * @param {number} n
	 * @returns {number[]}
	 */
	function getFloats(n) {
		const out = Array(n);
		for (let i = 0; i < n; i++) {
			out[i] = getFloat();
		}
		return out;
	}

	let packIndex = 0;

	function packEnd() {
		if (packIndex > 0) {
			byte_i++;
			packIndex = 0;
		}
	}

	/**
	 * @param {number} bits
	 * @returns {number}
	 */
	function getPacked(bits) {
		let byte = bytes[byte_i];
		let packValue = 0;

		for (let bit_i = 0; bit_i < bits; bit_i++) {
			const bit = 1 << packIndex;
			const b = (byte & bit) >> packIndex;
			packValue += b << bit_i;
			packIndex++;

			if (packIndex >= 8) {
				packIndex = 0;
				byte_i++;
				if (byte_i >= bytes.length) {
					throw Error("Unexpected end of input");
				}
				byte = bytes[byte_i];
			}
		}

		return packValue;
	}


	// Start decoding.
	let byte_i = 0;

	// Get encoding version (unused at the moment).
	const encodingVersion = getByte();
	if (encodingVersion !== ENCODING_VERSION_1_0) throw Error(`invalid encoding version ${encodingVersion}`);

	// Get model meta.
	const modelName = getPackedString();

	const zoomLevel = getPacked(7);
	const backgroundIndex = getPacked(4);
	const alphaIndex = getPacked(4);

	packEnd();

	// Get object data.
	const objectCount = getByte();
	const objects = /** @type {PicoCADModelObject[]} */(Array(objectCount));

	for (let object_i = 0; object_i < objectCount; object_i++) {
		const objectName = getPackedString();
		packEnd();
		const objectPos = getFloats(3);

		// Get vertices
		const vertexCount = getByte();
		const vertices = /** @type {number[][]} */(Array(vertexCount));

		for (let vertex_i = 0; vertex_i < vertexCount; vertex_i++) {
			vertices[vertex_i] = getFloats(3);
		}

		// Get faces
		const bpi = bitsToStore(vertexCount - 1);
		
		const faceCount = getByte();

		const faces = /** @type {PicoCADModelFace[]} */(Array(faceCount));

		for (let face_i = 0; face_i < faceCount; face_i++) {
			// Get face meta.
			const colorIndex = getPacked(4);
			const texture = getPacked(1) === 1;
			const shading = getPacked(1) === 1;
			const doubleSided = getPacked(1) === 1;
			const renderFirst = getPacked(1) === 1;

			// Get Indices.
			const index0 = getPacked(bpi);
			const indices = [index0];
			while (true) {
				const index = getPacked(bpi);
				
				if (index === index0) break;

				indices.push(index);
			}
			const index_count = indices.length;
			
			// Get UVs
			let uvs = /** @type {number[][]} */(Array(index_count));

			if (texture) {
				for (let uv_i = 0; uv_i < index_count; uv_i++) {
					const p0 = getPacked(7);
					const p1 = getPacked(7);

					uvs[uv_i] = [
						(p0 - 32) / 4,
						(p1 - 32) / 4,
					];
				}
			} else {
				for (let uv_i = 0; uv_i < index_count; uv_i++) {
					uvs[uv_i] = [0, 0];
				}
			}

			faces[face_i] = new PicoCADModelFace(
				indices,
				colorIndex,
				uvs,
				{
					texture: texture,
					shading: shading,
					doubleSided: doubleSided,
					renderFirst: renderFirst,
				}
			);
		}

		packEnd();

		// Got object!
		objects[object_i] = new PicoCADModelObject(
			objectName,
			objectPos,
			[0, 0, 0],
			vertices,
			faces,
		);
	}

	// Get texture data.
	const textureEncoding = getByte();

	/** @type {number[]} */
	let textureIndices = [];

	if (textureEncoding === TEXTURE_ENCODING_RLE) {
		for (let i = 0; i <= 15360; ) {
			const byte = getOptionalByte();
			if (byte < 0) break;

			const index = (byte & 0b11110000) >> 4;
			const count = (byte & 0b00001111) + 1;

			for (let j = 0; j < count; j++) {
				textureIndices.push(index);
			}
		}
	} else if (textureEncoding === TEXTURE_ENCODING_PACKED) {
		for (let i = 0; i < 7680; i++) {
			const byte = getOptionalByte();
			if (byte < 0) break;

			textureIndices.push(
				(byte & 0b11110000) >> 4,
				byte & 0b1111,
			);
		}
	} else {
		throw Error(`Invalid texture encoding code: ${textureEncoding}`);
	}

	// Add repeated trailing index
	if (textureIndices.length < 15360) {
		const index = textureIndices[textureIndices.length - 1];

		while (textureIndices.length < 15360) {
			textureIndices.push(index);
		}
	}

	// Done!
	return new PicoCADModel(objects, {
		name: modelName,
		alphaIndex: alphaIndex,
		backgroundIndex: backgroundIndex,
		zoomLevel: zoomLevel,
		texture: textureIndices,
	});
}

/**
 * @param {number[]} xs 
 */
function lzwNumbersToBitStream(xs) {
	const bytes = [];
	let byte = 0;
	let byte_i = 0;

	let maxSize = 512;
	let bits = 9;

	for (let i = 0; i < xs.length; i++) {
		if (256 + i >= maxSize) {
			bits++;
			maxSize *= 2;
		}

		const x = xs[i];

		for (let bit_i = 0; bit_i < bits; bit_i++) {
			let bit = 1 << bit_i;
			let b = (x & bit) >> bit_i;
			byte += b << byte_i;
			byte_i++;

			if (byte_i >= 8) {
				bytes.push(byte);
				byte_i = 0;
				byte = 0;
			}
		}
	}

	if (byte_i > 0) {
		bytes.push(byte);
	}

	return bytes;
}

/**
 * @param {number[]} bytes 
 */
 function bitStreamToLZWNumbers(bytes) {
	const xs = [];
	let x = 0;
	let x_i = 0;

	let maxSize = 512;
	let bits = 9;

	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i];

		for (let bit_i = 0; bit_i < 8; bit_i++) {
			let bit = 1 << bit_i;
			let b = (byte & bit) >> bit_i;
			x += b << x_i;
			x_i++;

			if (x_i >= bits) {
				xs.push(x);
				x_i = 0;
				x = 0;

				if (256 + xs.length >= maxSize) {
					bits++;
					maxSize *= 2;
				}
			}
		}
	}

	return xs;
}

/**
 * Get the min number of bits required to store `x`.
 * @param {number} x 
 */
function bitsToStore(x) {
	return Math.floor(Math.log2(x) + 1);
}
