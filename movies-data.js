// movies-data.js — Central place for all movie download links
// You can easily add new movies or change hosts here

const movieDownloads = {
    // Format: movieId: "full download URL"
    
    // Example with different cloud services
    27205: "https://mega.nz/file/ABC123#your-mega-key?download=1",           // Mega.nz
    155:   "https://storage.googleapis.com/your-bucket/the-dark-knight.mkv", // Google Cloud
    272:   "https://wildshare.net/ed0c14fa07065da3/batman-begins.mkv",       // Wildshare / mirror
    603:   "https://mega.nz/file/DEF456#another-key?download=1",             // Another Mega link
    
    // Add more movies here as you upload them
    // Example:
    // 12345: "https://backblaze-link-or-any-other-host.com/file.mkv",
};

// Export so script.js can use it
window.movieDownloads = movieDownloads;