import { PICO_COLORS } from "./pico";

export class PicoCADModel {
	/**
	 * @param {PicoCADModelObject[]} objects
	 * @param {object} [options]
	 * @param {string} [options.name] The model name.
	 * @param {number} [options.backgroundIndex] The PICO-8 color index used for the background. Defaults to 0.
	 * @param {number} [options.alphaIndex] The PICO-8 color index used for the texture alpha. Defaults to 0.
	 * @param {number} [options.zoomLevel] The preferred initial zoom level.
	 * @param {number[]} [options.texture] The 128x120 texture as an array of PICO-8 color indices.
	 */
	constructor(objects, options={}) {
		this.objects = objects;
		/** The model name. */
		this.name = options.name;
		/** The PICO-8 color index used for the background. */
		this.backgroundIndex = options.backgroundIndex ?? 0;
		/** The PICO-8 color index used for the texture alpha. */
		this.alphaIndex = options.alphaIndex ?? 0;
		/** The PICO-8 color index used for the texture alpha. */
		this.zoomLevel = options.zoomLevel;
		/** The 128x120 texture as an array of PICO-8 color indices. */
		this.texture = options.texture;
	}

	backgroundColor() {
		return PICO_COLORS[this.backgroundIndex];
	}
	
	alphaColor() {
		return PICO_COLORS[this.alphaIndex];
	}

	/**
	 * Converts the texture to pixels.
	 * @param {number[][]} [colors] Maps indices to RGB colors. Defaults to the PICO-8 colors.
	 * @returns {ImageData}
	 * @example
	 * let colors = Array(16);
	 * colors.fill([10, 25, 120])
	 * model.textureAsImage(colors)
	 */
	textureAsImage(colors) {
		if (colors == null) {
			colors = PICO_COLORS;
		}

		const imgData = new ImageData(128, 128);
		const data = imgData.data;
		const tex = this.texture;
		const alphaIndex = this.alphaIndex;

		let i = 0;
		let ti = 0;
		for (let y = 0; y < 120; y++) {
			for (let x = 0; x < 128; x++) {
				const index = tex[i];
				
				if (index !== alphaIndex) {
					const rgb = colors[index];

					data[ti    ] = rgb[0];
					data[ti + 1] = rgb[1];
					data[ti + 2] = rgb[2];
					data[ti + 3] = 255;
				}

				i++;
				ti += 4;
			}
		}

		return imgData;
	}
}

export class PicoCADModelObject {
	/**
	 * @param {string} name 
	 * @param {number[]} position 
	 * @param {number[]} rotation 
	 * @param {number[][]} vertices Array of triplets of 3D vertices.
	 * @param {PicoCADModelFace[]} faces 
	 */
	constructor(name, position, rotation, vertices, faces) {
		this.name = name;
		this.position = position;
		this.rotation = rotation;
		/** Array of triplets of 3D vertices. */
		this.vertices = vertices;
		this.faces = faces;
	}
}

/**
 * The face of an object.
 */
export class PicoCADModelFace {
	/**
	 * @param {number[]} indices Indices that point to a vertex in the object vertices. 0 base index.
	 * @param {number} colorIndex PICO-8 color index.
	 * @param {number[][]} uvs Array of pairs of UVs. Range is [0, 16].
	 * @param {object} [options]
	 * @param {boolean} [options.shading] Defaults to true.
	 * @param {boolean} [options.texture] Defaults to true.
	 * @param {boolean} [options.doubleSided] Defaults to false.
	 * @param {boolean} [options.renderFirst] Defaults to false.
	 */
	constructor(indices, colorIndex, uvs, options={}) {
		/** Indices that point to a vertex in the object vertices. 0 base index. */
		this.indices = indices;
		/** PICO-8 color index. */
		this.colorIndex = colorIndex;
		/** Array of pairs of UVs. Range is [0, 16]. */
		this.uvs = uvs;
		/** If this face should be rendered with shading. */
		this.shading = options.shading ?? true;
		/** If this face should be rendered with it's texture, or just using it's face color. */
		this.texture = options.texture ?? true;
		this.doubleSided = options.doubleSided ?? false;
		this.renderFirst = options.renderFirst ?? false;
	}

	color() {
		return PICO_COLORS[this.colorIndex];
	}
}
