import { PicoCADModel } from "./model";
import { Pass, WirePass } from "./pass";
import { PICO_COLORS } from "./pico";

/**
 * @param {WebGLRenderingContext} gl
 * @param {PicoCADModel} model 
 * @param {number} tesselationCount Pass 0 to do no tesselation
 */
export function prepareModelForRendering(gl, model, tesselationCount) {
	const { passes, wireframe } = loadModel(gl, model, tesselationCount + 1);

	// Read texture.
	const texture = convertTexture(model.texture, model.alphaIndex);

	return {
		passes: passes,
		wireframe: wireframe,
		textureIndices: texture,
	};
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {PicoCADModel} model 
 * @param {number} tn Number of tessellations
 */
function loadModel(gl, model, tn) {
	const passes = [];

	for (let i = 0; i < 16; i++) {
		const doubleSided = i % 2  < 1;
		const shading     = i % 4  < 2;
		const texture     = i % 8  < 4;
		// const priority = i      < 8;  // This flag is achieved using the ordering of the passes. That's why it's the last one :)
		
		passes.push(new Pass(gl, {
			cull: !doubleSided,
			shading: shading,
			texture: texture,
			clearDepth: i === 8,
		}));
	}

	const wireframePass = new WirePass(gl);
	const wireframeVertices = wireframePass.vertices;

	for (const object of model.objects) {
		const pos = object.position;
		// const rot = object.rotation; // unused?

		const rawVertices = object.vertices.map(xs => {
			return [
				-xs[0] - pos[0],
				-xs[1] - pos[1],
				xs[2] + pos[2],
			];
		});

		// pioCAD stores each vertex once.
		// But we'll have to duplicate vertices across faces!

		for (const face of object.faces) {
			const faceIndices = face.indices;
			const rawUVs = face.uvs;

			// Configure pass based on face props
			const pass = passes[
				(face.doubleSided       ? 0 : 1) +
				(face.shading ? 0 : 2) +
				(face.texture ? 0 : 4) +
				(face.renderFirst   ? 0 : 8)
			];

			const vertices = pass.vertices;
			const triangles = pass.triangles;
			const normals = pass.normals;
			const uvs = pass.uvs;
			const colorUVs = pass.colorUVs;

			// Color UVs
			const colorU = 0.03125 + face.colorIndex / 16;
			const colorV = 0;

			// Get current vertex index.
			const vertexIndex0 = Math.floor(vertices.length / 3);

			// Get faces vertices and uvs.
			// Save face edges to wireframe buffer.
			const faceVertices = [];
			const faceUVs = [];

			for (let i = 0; i < faceIndices.length; i++) {
				const vertex = rawVertices[faceIndices[i]];
				const vertex2 = rawVertices[faceIndices[i === 0 ? faceIndices.length - 1 : i - 1]];
				const rawUV = rawUVs[i];

				faceVertices.push(vertex);

				wireframeVertices.push(
					vertex[0], vertex[1], vertex[2],
					vertex2[0], vertex2[1], vertex2[2],
				);

				faceUVs.push([
					rawUV[0] / 16,
					rawUV[1] / 16,
				]);
			}

			// Calculate face normal (should be same for all triangles)
			const faceNormal = calculateFaceNormal(faceVertices);

			// Get triangles
			if (faceIndices.length === 4 && face.texture && tn > 1) {
				// Tesselate quad.
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
						colorUVs.push(colorU, colorV);
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
				// We always save both texture and color info, since models can be rendered in color mode.

				for (let i = 0; i < faceUVs.length; i++) {
					// Save color.
					colorUVs.push(colorU, colorV);

					// Save texture UVs.
					if (face.texture) {
						const uv = faceUVs[i];
						uvs.push(uv[0], uv[1]);
					} else {
						// Re-use color UV.
						uvs.push(colorU, colorV);
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
	for (const pass of passes) {
		pass.save();
	}

	wireframePass.save();

	return {
		passes: passes,
		wireframe: wireframePass,
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


/**
 * @param {number[]} sourceIndices 
 * @param {number} alphaIndex
 */
export function convertTexture(sourceIndices, alphaIndex) {
	const result = /** @type {number[]} */(Array(16384)).fill(255);

	for (let i = 0; i < sourceIndices.length; i++) {
		const index = sourceIndices[i];
		if (index === alphaIndex) {
			// this is transparent
			result[i] = 255;
		} else {
			result[i] = index;
		}
	}

	// Add hidden indices on bottom row for single color faces.
	for (let i = 0; i < 16; i++) {
		result[16256 + i] = i;
	}

	return result;
}
