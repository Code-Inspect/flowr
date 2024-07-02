f <- function(g, a, b) {
    x <- g(a + b) + b
    print(x)
    return(x)
    a
}

k <- f(\(x) { return(x * 2) }, 3, 4)
print(-k)
