/**
 * Provides utility types and functions to provide difference information if two structures
 * are not equal. Maybe. Sometime, in the far future this will be as capable as the waldo package :dream:
 *
 * @module
 */

import { setMinus } from './set'
import type { MergeableRecord } from './objects'

/**
 * Unifies the shape of all difference reports.
 * They should have an array of comments on the potential differences/equality of
 * the structures and a function to check if they are really equal.
 */
export interface DifferenceReport {
	/**
   * A human-readable description of differences during the comparison
   * In combination with {@link isEqual} this can be used to provide detailed
   * explanation on equal structures as well (e.g., if structures _could_ be equal).
   */
	comments(): readonly string[] | undefined
	/**
   * @returns true iff the compared structures are equal
   */
	isEqual(): boolean
}

export interface WriteableDifferenceReport extends DifferenceReport {
	addComment(comment: string): void
}

/**
 * Identifies the information required by the core difference functions.
 * The `leftname` and `rightname` fields are only used to provide more useful
 * information in the difference report.
 */
export interface GenericDifferenceInformation extends MergeableRecord {
	/** A human-readable name for the left structure in `left == right`. */
	readonly leftname:  string
	/** A human-readable name for the right structure in `left == right`. */
	readonly rightname: string
	/** The report on the difference of the two structures. */
	readonly report:    WriteableDifferenceReport
	/** A human-readable indication of where we are (the prefix of the information if the structures differ) */
	readonly position:  string
}


export function setDifference<T>(left: ReadonlySet<T>, right: ReadonlySet<T>, info: GenericDifferenceInformation): void {
	const lWithoutR = setMinus(left, right)
	const rWithoutL = setMinus(right, left)
	if(lWithoutR.size === 0 && rWithoutL.size === 0) {
		return
	}
	let message: string = info.position
	if(lWithoutR.size > 0) {
		message += ` More elements in ${info.leftname}: ${JSON.stringify([...lWithoutR])}`
	}
	if(rWithoutL.size > 0) {
		message += lWithoutR.size > 0 ? ' and m' : 'M'
		message += `ore in ${info.rightname}: ${JSON.stringify([...rWithoutL])}`
	}
	info.report.addComment(message)
}
