
export class GIFEncoder {
	/**
	 * The currently backed ArrayBuffer, note this reference may change as the buffer grows in size.
	 */
	buffer: ArrayBuffer;
	/**
	 * An internal API that holds an expandable buffer and allows writing single or multiple bytes.
	 */
	stream: {
		writeByte(byte: number): void;
		writeBytes(array: Uint8Array, offset: number, byteLength: number);
	};

	constructor(options?: {
		/**
		 * In "auto" mode, the header and first-frame metadata (global palette) will be written upon writing the first frame.
		 * 
		 * If set to false, you will be responsible for first writing a GIF header, then writing frames with { first } boolean specified.
		 * 
		 * Defaults to false.
		 */
		auto?: boolean,
		/**
		 * The number of bytes to initially set the internal buffer to, it will grow as bytes are written to the stream
		 * 
		 * Defaults to 1024.
		 */
		initialCapacity?: number,
	})

	/**
	 * Writes a single frame into the GIF stream.
	 * @param index The indexed image (set of palette indices, one byte per index).
	 */
	writeFrame(index: Uint8Array, width: number, height: number, options?: {
		/**
		 * The color table for this frame, which is required for the first frame (i.e. global color table) but optional for subsequent frames.
		 * 
		 * If not specified, the frame will use the first (global) color table in the stream.
		 */
		palette?: GIFPalette,
		/**
		 * In non-auto mode, set this to true when encoding the first frame in an image or sequence, and it will encode the Logical Screen Descriptor and a Global Color Table.
		 * 
		 * This option is ignored in auto mode.
		 */
		first?: boolean,
		/**
		 * Enable 1-bit transparency for this frame.
		 * 
		 * Defaults to false.
		 */
		transparent?: boolean,
		/**
		 * If `transparent` is enabled, the color at the specified palette index will be treated as fully transparent for this frame.
		 * 
		 * Defaults to 0
		 */
		transparentIndex?: number,
		/**
		 * The frame delay in milliseconds.
		 * 
		 * Defaults to 0.
		 */
		delay?: number,
		/**
		 * Repeat count, set to `-1` for 'once', `0` for 'forever', and any other positive integer for the number of repetitions.
		 * 
		 * Defaults to 0.
		 */
		repeat?: number,
		/**
		 * Advanced GIF dispose flag override, -1 is 'use default'.
		 * 
		 * Defaults to -1.
		 */
		dispose?: number,
	}): void;

	/**
	 * Writes the GIF end-of-stream character, required after writing all frames for the image to encode correctly.
	 */
	finish(): void;

	/**
	 * Gets a slice of the Uint8Array bytes that is underlying this GIF stream. (Note: this incurs a copy).
	 */
	bytes(): Uint8Array;

	/**
	 * Gets a direct typed array buffer view into the Uint8Array bytes underlying this GIF stream. (Note: no copy involved, but best to use this carefully).
	 */
	bytesView(): Uint8Array;

	/**
	 * Writes a GIF header into the stream, only necessary if you have specified `{ auto: false }` in the GIFEncoder options.
	 */
	writeHeader(): void;

	/**
	 * Resets this GIF stream by simply setting its internal stream cursor (index) to zero, so that subsequent writes will replace the previous data in the underlying buffer.
	 */
	reset(): void;

	/**
	 * For the given pixel as [r,g,b] or [r,g,b,a] (depending on your pixel format), determines the index (0...N) of the nearest color in your palette array of colors in the same RGB(A) format.
	 */
	nearestColorIndex(palette: GIFPalette, pixel: number[]): number;
	
	/**
	 * Same as `nearestColorIndex`, but returns a tuple of index and distance (euclidean distance squared).
	 */
	nearestColorIndexWithDistance(palette: GIFPalette, pixel: number[]): [number, number];
}
export default GIFEncoder;

/**
 * This will determine the color index for each pixel in the rgba image.
 * @param rgbaBytes A flat Uint8Array or Uint8ClampedArray of per-pixel RGBA data.
 * @param palette 
 * @param format Defaults to "rgb565".
 * @returns An index array (each one byte) length equal to rgba.length / 4.
 */
export function applyPalette(rgbaBytes: Uint8Array, palette: GIFPalette, format?: GIFFormat): Uint8Array;

/**
 * `rgb565`: 5 bits red, 6 bits green, 5 bits blue (better quality, slower).
 * 
 * `rgb444`: 4 bits per channel (lower quality, faster).
 * 
 * `rgba4444`: 4 bits per channel with alpha.
 */
export type GIFFormat = "rgb565" | "rgb444" | "rgba4444";

/**
 * A set of RGB or RGBA colors, in byte per channel format.
 * @example
 * const palette = [
 *   // black
 *   [0, 0, 0],
 *   // white
 *   [255, 255, 255],
 * ];
 */
export type GIFPalette = number[][];
