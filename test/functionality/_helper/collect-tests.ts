import fs from 'fs'
import path from 'path'

/**
 * Require all files in a folder that end with a suffix, will never recurse into subfolders
 * @param folder - the folder to require all files from
 * @param suffix - the suffix which the files of interest must have
 */
export function requireAllTestsInFolder(folder: string, suffix = '-tests.ts'): void {
	for(const fileBuff of fs.readdirSync(folder, { recursive: false })) {
		const file = fileBuff.toString()
		if(file.endsWith(suffix)) {
			require(path.join(folder,file))
		} else if(!file.endsWith('.spec.ts')) {
			throw new Error(`Unexpected file ${file} in ${folder}, neither matches the import suffix '${suffix}', nor the test suffix '.spec.ts'. This is a sanity check so no files are lost. Please restructure your folders if this is intended.`)
		}
	}
}
