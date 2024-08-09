f0 <- function(a, b=42) {
    x <- a + b
    while(x > 0) {
        x <- x - 1
        a <- a + x * 2
    }
    print(x)
    a
}

f1 <- function(a, b) {
    c <- a + b
    if(a > 0) {
        d <- c * 2
    } else {
        d <- 3
    }

    return(f0(a) + f0(d, 13))
}

f2 <- function(a, b) {
    c0 <- a + b
    c1 <- c0 + a + b
    c2 <- a + c1 + b
    c3 <- a + b + c2
    c4 <- c3 + a + b
    c5 <- a + c4 + b
    c6 <- a + b + c5
    for(i in 1:10) {
        c6 <- c6 + a + b
    }
    return(f0(a, c6))
}

f3 <- function(a, b) {
    c0 <- a + b
    c1 <- c0 + a + b
    c2 <- a + c1 + b
    c3 <- a + b + c2
    c4 <- c3 + a + b
    c5 <- a + c4 + b
    c6 <- a + b + c5
    for(i in 1:10) {
        c6 <- c6 + a + b
    }
    return(f1(a, c6))
}

f4 <- function(a, b) {
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
    f3(a, b)
}

f5 <- function(a) {
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
    f4(a, a)
}

f6 <- function(a) {
    f5(f4(a, a))
}

# only this one is required
print(f0(3))
