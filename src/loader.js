import { parsePicoCADData } from "./parser-data";
import { parsePicoCADTexture } from "./parser-texture";
import { readLine, splitString } from "./parser-utils";
import { Pass, WirePass } from "./pass";
import { PICO_COLORS } from "./pico";

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} source 
 */
export function loadPicoCADModel(gl, source) {
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
	const { passes, faceCount, objectCount, wireframe } = loadModel(gl, data);

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

			// Save current vertex index.
			const vertexIndex0 = Math.floor(vertices.length / 3);

			// Save vertices used by this face.
			for (let i = 0; i < faceIndices.length; i++) {
				const vertex = rawVertices[faceIndices[i] - 1];
				const vertex2 = rawVertices[faceIndices[i === 0 ? faceIndices.length - 1 : i - 1] - 1];

				vertices.push(vertex[0], vertex[1], vertex[2]);

				wireframeVertices.push(
					vertex2[0], vertex2[1], vertex2[2],
					vertex[0], vertex[1], vertex[2],
				);
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
