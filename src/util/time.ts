/**
 * Retrieve a string in the form of "YYYY-MM-DD-HH-MM-SS-MS" from a Date object.
 *
 * @param date - The date to convert, defaults to the current date
 */
export function date2string(date: Date = new Date()): string {
	return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}-${date.getMilliseconds()}`
}
