import semver from 'semver/preload'
import type { RShell } from '../../../src/r-bridge/shell'

/**
 * Automatically skip a test if it does not satisfy the given version pattern (for a [semver](https://www.npmjs.com/package/semver) version).
 *
 * @param shell            - The shell to use to query for the version it uses
 * @param versionToSatisfy - The version pattern to satisfy (e.g., `"<= 4.0.0 || 5.0.0 - 6.0.0"`)
 * @param test 					   - The test to skip if the version does not satisfy the pattern
 */
export const testRequiresRVersion = async(shell: RShell, versionToSatisfy: string, test: Mocha.Context): Promise<void> => {
	const version = await shell.usedRVersion()
	if(version === null || !semver.satisfies(version, versionToSatisfy)) {
		console.warn(`Skipping test because ${JSON.stringify(version?.raw)} does not satisfy ${JSON.stringify(versionToSatisfy)}.`)
		test.skip()
	}
}
