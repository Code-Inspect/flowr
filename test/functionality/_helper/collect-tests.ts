import fs from 'node:fs'
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
		}
	}
}