# TODO normalize, decorate etc.
input <- file("../test/testfiles/example-cfg.R")
exprs <- rlang::parse_exprs(input)

# the conversion code is based on lazyeval::ast_

# currently no json at all :D
flowr.expr_to_json <- function(x) {
  if (base::is.expression(x) || base::is.list(x)) {
    trees <- base::vapply(x, flowr.tree, character(1))
    out <- base::paste0(trees, collapse = "\n\n")
  } else {
    out <- flowr.tree(x)
  }

  cat(out, "\n")
}

flowr.is_atomic <- function(x) {
  typeof(x) %in% c("logical", "integer", "double", "complex", "character", "raw")
}

flowr.is_name <- function(x) {
  typeof(x) == "symbol"
}

flowr.is_call <- function(x) {
  typeof(x) == "language"
}

flowr.is_pairlist <- function(x) {
  typeof(x) == "pairlist"
}


flowr.tree <- function(x, level = 1) {
  if (flowr.is_atomic(x) && base::length(x) == 1) {
    label <- base::paste0(" ", base::deparse(x)[1])
    children <- NULL
  } else if (flowr.is_name(x)) {
    x <- base::as.character(x)
    if (x == "") {
      # Special case the missing argument
      label <- "`MISSING"
    } else {
      label <- base::paste0("`", base::as.character(x))
    }

    children <- NULL
  } else if (flowr.is_call(x)) {
    label <- "()"
    children <- base::vapply(base::as.list(x), flowr.tree, character(1), level = level + 1)
  } else if (flowr.is_pairlist(x)) {
    label <- "[]"

    branches <- paste("\u2517", format(names(x)), "=")
    children <- character(length(x))
    for (i in seq_along(x)) {
      children[i] <- flowr.tree(x[[i]], level = level + 1)
    }
  } else {
    # Special case for srcrefs, since they're commonly seen
    if (inherits(x, "srcref")) {
      label <- "<srcref>"
    } else {
      label <- paste0("<", typeof(x), ">")
    }
    children <- NULL
  }

  indent <- paste0(str_dup(" ", level - 1), "> ")

  if (is.null(children)) {
    paste0(indent, label)
  } else {
    paste0(indent, label, "\n", paste0(children, collapse = "\n"))
  }
}

str_dup <- function(x, n) {
  paste0(rep(x, n), collapse = "")
}

print(flowr.expr_to_json(exprs))
