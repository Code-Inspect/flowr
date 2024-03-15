import { ts2r } from './lang-4.x'

export const ErrorMarker = 'err'

/** Command(s) to be issued at the start of each shell */
export function initCommand(eol: string): string {
	/* define the get function complete wrapped in a try so that we can handle failures gracefully on stdout
	 * furthermore, we compile for performance reasons
	 */
	return 'flowr_get_ast<-compiler::cmpfun(function(...){tryCatch({'
		/* the actual code to parse the R code, ... allows us to keep the old 'file=path' and 'text=content' semantics. we define flowr_output using the super assignment to persist it in the env! */
		+ 'flowr_output<<-getParseData(parse(...,keep.source=TRUE),includeText=TRUE);'
		/* json conversion of the output, dataframe="values" allows us to receive a list of lists (which is more compact)!
		 * so we do not depend on jsonlite and friends, we do so manually (:sparkles:)
		 */
		+ 'cat(paste0(sprintf("[%s,%s,%s,%s,%s,%s,%s,%s,%s]",flowr_output$line1,flowr_output$col1,flowr_output$line2,flowr_output$col2,flowr_output$id,flowr_output$parent,encodeString(flowr_output$token,quote="\\""),ifelse(flowr_output$terminal,"true","false"),encodeString(flowr_output$text,quote="\\"")),collapse=","))'
		/* error handling (just produce the marker) */
		+ `},error=function(e){cat("${ErrorMarker}")});cat(${ts2r(eol)})},options=compiler::setCompilerOptions(optimize=3));`
}
