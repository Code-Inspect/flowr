library(cranlogs)

# retrieve top N packages
N <- 500

# Get the names of all packages
pkgnames <- available.packages(repos="https://cloud.r-project.org")[,1]

# init result
download_numbers <- data.frame()

stepsize <- 750
for (i in seq(1, length(pkgnames), by = stepsize)) {
  start <- i
  end <- min(i+stepsize-1, length(pkgnames))
  cat("Retrieving download numbers for packages", start, "to", end, "from total", length(pkgnames), "\n")
  data <- cran_downloads(packages = pkgnames[start:end], when="last-month")
  download_numbers <- rbind(download_numbers, data)
}

# now packages appear often as they are with different days in the data, therefore we aggregate
download_numbers <- aggregate(count ~ package, data=download_numbers, sum)

# sort download numbers
download_numbers <- download_numbers[order(-download_numbers$count),]
print(download_numbers[1:N,])

write.table(download_numbers[1:N,], file="top-r-downloads.txt", quote=FALSE, sep=",", row.names=FALSE, col.names=FALSE)
