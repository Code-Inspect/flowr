# Takes the top files identified by `top-downloads.R` and saved in `top-r-downloads`
# Overwrite `to`, to a path to your liking
to <- path.expand("~/r-pkg-sources")
from <- "top-r-downloads.txt"

# we are only interested in the package names
data <- read.csv(from, header = FALSE, sep = ",", stringsAsFactors = FALSE)[[1]]

cat(paste("Downloading", length(data), "packages to", to, "\n"))

dir.create(to, recursive = TRUE, showWarnings = FALSE)

download.packages(data, type = "source", destdir = to, method = "curl", dependencies = FALSE,repos=c("https://cran.r-project.org"))

cat(paste("Downloaded", length(data), "packages to", to, "\nUnzipping...\n"))

# unzip all sources and remove the zip files
for (f in list.files(to, pattern = ".tar.gz", full.names = TRUE)) {
    untar(f, exdir = to)
    file.remove(f)
}

cat("Done.\n")
