# Downloads all packages currently available
# Overwrite `to`, to a path to your liking
to <- path.expand("~/r-pkg-sources-full")

repos <- c("https://cran.r-project.org")

data <- available.packages(repos=repos)[,1]

cat(paste("Downloading", length(data), "packages to", to, "\n"))

dir.create(to, recursive = TRUE, showWarnings = FALSE)

download.packages(data, type = "source", destdir = to, method = "curl", dependencies = FALSE, repos = repos)

cat(paste("Downloaded", length(data), "packages to", to, "\nUnzipping...\n"))

# unzip all sources and remove the zip files
for (f in list.files(to, pattern = ".tar.gz", full.names = TRUE)) {
    untar(f, exdir = to)
    file.remove(f)
}

cat("Done.\n")
