import { parsePicoCADData } from "./parser-data";
import { parsePicoCADTexture } from "./parser-texture";
import { readLine, splitString } from "./parser-utils";
import { Pass, WirePass } from "./pass";
import { PICO_COLORS } from "./pico";

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} source 
 * @param {number} tesselationCount Pass 0 to do no tesselation
 */
export function loadPicoCADModel(gl, source, tesselationCount) {
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
	const pPriorityCullTexture = new Pass(gl, { cull: true, useTexture: true });
	const pPriorityCull = new Pass(gl, { cull: true, useTexture: false });
	const pPriorityTexture = new Pass(gl, { cull: false, useTexture: true });
	const pPriority = new Pass(gl, { cull: false, useTexture: false });
	const pCullTexture = new Pass(gl, { cull: true, useTexture: true, clearDepth: true });
	const pCull = new Pass(gl, { cull: true, useTexture: false });
	const pTexture = new Pass(gl, { cull: false, useTexture: true });
	const p = new Pass(gl, { cull: false, useTexture: false });

	const wireframePass = new WirePass(gl);
	const wireframeVertices = wireframePass.vertices;

	let faceCount = 0;

	for (const object of rawModel.array) {
		const pos = object.dict.pos.array;
		const rot = object.dict.rot.array;

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
					if (useTexture) {
						pass = pPriorityTexture;
					} else {
						pass = pPriority;
					}
				} else {
					if (useTexture) {
						pass = pPriorityCullTexture
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
						pass = pCullTexture
					} else {
						pass = pCull;
					}
				}
			}

			const vertices = pass.vertices;
			const triangles = pass.triangles;

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

			if (faceIndices.length === 4 && pass.useTexture && tn > 1) {
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
					}
				}

				let i = 0;
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
				}

				if (pass.useTexture) {
					// Save UVs used by this face.
					const uvs = pass.uvs;
				
					for (const uv of faceUVs) {
						uvs.push(uv[0], uv[1]);
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
	}

	// Init and return passes.
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
