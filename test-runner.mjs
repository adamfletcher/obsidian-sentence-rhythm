import esbuild from "esbuild";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function findTests(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const tests = [];

	for (const entry of entries) {
		const entryPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			tests.push(...await findTests(entryPath));
		} else if (entry.name.endsWith(".test.ts")) {
			tests.push(entryPath);
		}
	}

	return tests;
}

const tempDir = await mkdtemp(path.join(tmpdir(), "sentence-rhythm-tests-"));

try {
	const tests = await findTests("src");

	for (const testPath of tests) {
		const outfile = path.join(tempDir, `${path.basename(testPath, ".ts")}.mjs`);

		await esbuild.build({
			entryPoints: [testPath],
			bundle: true,
			format: "esm",
			platform: "node",
			target: "node18",
			outfile,
			logLevel: "silent",
		});

		await import(pathToFileURL(outfile).href);
		console.log(`ok ${testPath}`);
	}
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
