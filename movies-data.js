// movies-data.js — Central place for all movie & series download links

const downloadLinks = {
    // Single Movies
    875828: "https://vdl.np-downloader.com/sdm_downloads/download-peaky-blinders-the-immortal-man-2026/",     // Peaky Blinders: The Immortal Man
    115955: "https://vdl.np-downloader.com/sdm_downloads/download-scream-7-2026/",                        // Scream 7
    1171145: "https://vdl.np-downloader.com/sdm_downloads/download-crime-101-2026/",                      // Crime 101
    83533: "https://vdl.np-downloader.com/sdm_downloads/download-avatar-fire-and-ash-2025/",              // Avatar: Fire and Ash
    1265609: "https://vdl.np-downloader.com/sdm_downloads/download-war-machine-2026/"                     // War Machine
};

// Series data (for shows with multiple seasons/episodes)
const seriesData = {
    1399: {  // Game of Thrones TMDB ID
        title: "Game of Thrones",
        seasons: {
            1: {
                1: "https://loadedfiles.org/f478d8be832a2419",
                2: "https://loadedfiles.org/a1c1d4f99f14f2e1",
                3: "https://loadedfiles.org/06fd1b340d0bd72d",
                4: "https://loadedfiles.org/2f46444051a7ddc9",
                5: "https://loadedfiles.org/3b04f9adab575c5c",
                6: "https://loadedfiles.org/6a179be9251f3f85",
                7: "https://loadedfiles.org/bcf875ff609e1683",
                8: "https://loadedfiles.org/9519736e75fedeac",
                9: "https://loadedfiles.org/e77927ba1689cf1e",
                10: "https://loadedfiles.org/d8de45ea898f107f"
            }
            // Add Season 2, 3, etc. here later
        }
    }
};

// Export both (Important - Do not remove)
window.downloadLinks = downloadLinks;
window.seriesData = seriesData;