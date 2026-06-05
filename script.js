// script.js – Final consolidated version (all trailer logic merged)
// ONLY ONE LINE CHANGED: runtime format updated to hours and minutes

// ================= CONFIG =================
const API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const BASE_URL = 'https://api.themoviedb.org/3';
const YOUTUBE_API_KEY = 'AIzaSyDu1y5xIX9-DblXaN7Ek7Y1Xg996ez0zwQ';
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentPage = 1;
let currentGenre = '';
let currentYear = '';
let currentRating = '';
let currentSearch = '';
let isGridView = true;
let allMovies = [];
let currentMovie = null;

const els = {
    moviesGrid: document.getElementById('moviesGrid'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    genreFilter: document.getElementById('genreFilter'),
    yearFilter: document.getElementById('yearFilter'),
    ratingFilter: document.getElementById('ratingFilter'),
    gridView: document.getElementById('gridView'),
    listView: document.getElementById('listView'),
    movieModal: document.getElementById('movieModal'),
    modalClose: document.querySelector('.close'),
    exploreBtn: document.getElementById('exploreBtn'),
    trendingBtn: document.getElementById('trendingBtn'),
    hamburger: document.querySelector('.hamburger'),
    navMenu: document.querySelector('.nav-menu'),
    // Added for trending section
    trendingGrid: document.getElementById('trendingGrid'),
    gridViewTrending: document.getElementById('gridViewTrending'),
    listViewTrending: document.getElementById('listViewTrending'),
    // Added for animation section
    animationGrid: document.getElementById('animationGrid'),
    gridViewAnimation: document.getElementById('gridViewAnimation'),
    listViewAnimation: document.getElementById('listViewAnimation'),
    clearWatchlistBtn: document.getElementById('clearWatchlistBtn')
};

document.addEventListener('DOMContentLoaded', () => {
    loadPopularMovies();
    setupEventListeners();

    // ─── FIX 1: Remember current page on refresh ─────────────────────────
    const savedSection = window.location.hash.substring(1) || 'movies';
    switchSection(savedSection);
});

function setupEventListeners() {
    els.searchBtn.addEventListener('click', handleSearch);
    els.searchInput.addEventListener('keypress', e => e.key === 'Enter' && handleSearch());

    els.genreFilter.addEventListener('change', handleFilterChange);
    els.yearFilter.addEventListener('change', handleFilterChange);
    els.ratingFilter.addEventListener('change', handleFilterChange);

    els.gridView.addEventListener('click', () => setViewMode('grid'));
    els.listView.addEventListener('click', () => setViewMode('list'));

    // Fixed: Trending view toggles
    if (els.gridViewTrending) els.gridViewTrending.addEventListener('click', () => setViewMode('grid'));
    if (els.listViewTrending) els.listViewTrending.addEventListener('click', () => setViewMode('list'));

    // Animation view toggles
    if (els.gridViewAnimation) els.gridViewAnimation.addEventListener('click', () => setViewMode('grid'));
    if (els.listViewAnimation) els.listViewAnimation.addEventListener('click', () => setViewMode('list'));

    els.loadMoreBtn.addEventListener('click', loadMoreMovies);

    els.modalClose.addEventListener('click', closeModal);
    window.addEventListener('click', e => e.target === els.movieModal && closeModal());

    els.exploreBtn.addEventListener('click', () => document.getElementById('movies').scrollIntoView({ behavior: 'smooth' }));
    els.trendingBtn.addEventListener('click', loadTrendingMovies);

    els.hamburger.addEventListener('click', () => els.navMenu.classList.toggle('active'));

    // Fixed: Clear Watchlist button
    if (els.clearWatchlistBtn) {
        els.clearWatchlistBtn.addEventListener('click', () => {
            if (confirm('Clear entire watchlist?')) {
                localStorage.removeItem('watchlist');
                renderWatchlist();
            }
        });
    }

    // Trailer button handler
    document.addEventListener('click', e => {
        if (e.target.closest('.trailer-btn')) {
            if (e.target.closest('#watchlistGrid')) return;
            if (!currentMovie) {
                alert('No movie selected');
                return;
            }
            const { id, title, release_date } = currentMovie;
            const year = release_date ? release_date.slice(0, 4) : 'N/A';

            getMovieTrailer(id, title, year).then(trailer => {
                if (trailer) displayTrailer(trailer);
                else alert('No trailer available');
            }).catch(err => {
                console.error(err);
                alert('Error loading trailer');
            });
        }
    });

    // Watchlist button handler
    document.addEventListener('click', e => {
        if (e.target.closest('.watchlist-btn')) {
            const card = e.target.closest('.movie-card');
            const movieId = card ? parseInt(card.dataset.movieId) : currentMovie ? currentMovie.id : null;
            if (movieId) toggleWatchlist(movieId);
        }
    });
}

// Watchlist navigation and rendering
function switchSection(sectionId) {
    document.querySelectorAll('section, main').forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');

    // ─── FIX 2: Show correct content when returning to any page ─────────────────────────
    if (sectionId === 'home' || sectionId === 'movies') {
        document.getElementById('movies').style.display = 'block';
        if (allMovies.length === 0) loadPopularMovies();
        else displayMovies(allMovies);
    }

    // Fixed: Load trending movies when user clicks Trending in nav
    if (sectionId === 'trending') {
        loadTrendingMovies();
    }

    // Load animations when user clicks Animation in nav
    if (sectionId === 'animation') {
        loadAnimations();
    }

    if (sectionId === 'watchlist') renderWatchlist();
}

// Attach navigation to all links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('href').substring(1);
        switchSection(sectionId);
    });
});

// ─── FIX 3: Logo now correctly shows movie grid (not blank home) ─────────────────────────
document.querySelector('.nav-logo').addEventListener('click', () => {
    switchSection('movies');
});

// Rest of your original functions (100% unchanged from here)
function toggleWatchlist(movieId) {
    let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
    if (watchlist.includes(movieId)) {
        watchlist = watchlist.filter(id => id !== movieId);
        showNotification('Removed from Watchlist');
    } else {
        watchlist.push(movieId);
        showNotification('Added to Watchlist');
    }
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    
    // Update watchlist button text if modal is open
    const watchlistBtn = document.querySelector('.watchlist-btn');
    if (watchlistBtn) {
        const isInWatchlist = watchlist.includes(movieId);
        watchlistBtn.innerHTML = isInWatchlist ? '<i class="fas fa-minus"></i> Remove from Watchlist' : '<i class="fas fa-plus"></i> Add to Watchlist';
    }
    
    if (document.getElementById('watchlist').style.display === 'block') renderWatchlist();
}

async function renderWatchlist() {
    const ids = JSON.parse(localStorage.getItem('watchlist')) || [];
    const grid = document.getElementById('watchlistGrid');
    const empty = document.getElementById('watchlistEmpty');

    if (ids.length === 0) {
        empty.style.display = 'block';
        grid.innerHTML = '';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = '<div style="text-align:center;padding:3rem;"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const promises = ids.map(id => fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`).then(r => r.json()));
        const movies = await Promise.all(promises);

        grid.innerHTML = movies.map(movie => `
            <div class="movie-card" data-movie-id="${movie.id}">
                <img src="${IMAGE_BASE_URL}${movie.poster_path}" alt="${movie.title}" class="movie-poster">
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <div class="movie-meta">
                        <span>${movie.release_date ? movie.release_date.slice(0,4) : 'N/A'}</span>
                        <span class="rating">⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                    </div>
                </div>
                <div class="movie-overlay">
                    <button class="btn btn-primary trailer-btn" onclick="handleTrailer(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')">Watch Trailer</button>
                    <button class="btn btn-secondary">Download</button>
                    <button class="btn btn-secondary watchlist-btn">Remove</button>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const movieId = parseInt(card.dataset.movieId);
                showMovieDetails(movieId);
            });
        });

    } catch (e) {
        grid.innerHTML = '<p style="color:#e50914;text-align:center;padding:2rem;">Failed to load watchlist.</p>';
    }
}

// ─── Rest of your original code (100% unchanged) ─────────────────────────
function showLoading() {
    els.loadingSpinner.classList.add('active');
    els.loadMoreBtn.disabled = true;
    els.loadMoreBtn.textContent = 'Loading...';
}

function hideLoading() {
    els.loadingSpinner.classList.remove('active');
    els.loadMoreBtn.disabled = false;
    els.loadMoreBtn.textContent = 'Load More';
}

async function fetchFromAPI(endpoint) {
    try {
        showLoading();
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}`;
        console.log('Fetching:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        const data = await res.json();
        hideLoading();
        return data;
    } catch (err) {
        console.error('Fetch failed:', err.message, err);
        hideLoading();
        return null;
    }
}

async function loadPopularMovies(retry = 0) {
    // Only load movies that have been uploaded (in downloadLinks)
    if (window.downloadLinks) {
        const movieIds = Object.keys(window.downloadLinks).map(id => parseInt(id));
        
        if (movieIds.length === 0) {
            els.moviesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No movies uploaded yet.</p>';
            els.loadMoreBtn.style.display = 'none';
            return;
        }

        showLoading();
        
        try {
            const promises = movieIds.map(id => fetchFromAPI(`/movie/${id}`));
            const movies = await Promise.all(promises);
            const validMovies = movies.filter(m => m !== null);
            
            if (currentPage === 1) {
                allMovies = validMovies;
                // Add series from seriesData to the grid
                if (window.seriesData) {
                    const seriesList = Object.values(window.seriesData).map(series => ({
                        id: series.id,
                        title: series.title,
                        poster_path: series.poster_path,
                        release_date: "2021-01-01",
                        vote_average: 8.5,
                        media_type: "tv"
                    }));
                    allMovies = [...seriesList, ...allMovies];
                }
                // Add animations from animationData to the grid
                if (window.animationData) {
                    const animationList = Object.values(window.animationData).map(animation => ({
                        id: animation.id,
                        title: animation.title,
                        poster_path: animation.poster_path,
                        release_date: "2021-01-01",
                        vote_average: 8.5,
                        media_type: "tv"
                    }));
                    allMovies = [...animationList, ...allMovies];
                }
                displayMovies(allMovies);
            }
            hideLoading();
        } catch (err) {
            console.error('Failed to load uploaded movies:', err);
            hideLoading();
            if (retry < 2) {
                setTimeout(() => loadPopularMovies(retry + 1), 1200);
            } else {
                showFallbackContent();
            }
        }
    } else {
        els.moviesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No movies uploaded yet.</p>';
        els.loadMoreBtn.style.display = 'none';
    }
}

function loadMoreMovies() {
    currentPage++;
    if (currentSearch) {
        searchMovies(currentSearch);
    } else {
        loadPopularMovies();
    }
}

async function loadTrendingMovies() {
    currentPage = 1;
    currentGenre = currentYear = currentRating = currentSearch = '';
    els.genreFilter.value = els.yearFilter.value = els.ratingFilter.value = els.searchInput.value = '';

    // Only load movies that have been uploaded (in downloadLinks)
    if (window.downloadLinks) {
        const movieIds = Object.keys(window.downloadLinks).map(id => parseInt(id));
        
        if (movieIds.length === 0) {
            els.trendingGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No movies uploaded yet.</p>';
            document.getElementById('trending').style.display = 'block';
            document.getElementById('movies').style.display = 'none';
            return;
        }

        showLoading();
        
        try {
            const promises = movieIds.map(id => fetchFromAPI(`/movie/${id}`));
            const movies = await Promise.all(promises);
            const validMovies = movies.filter(m => m !== null);
            
            allMovies = validMovies;
            
            // Show trending section and display movies in trending grid
            document.getElementById('trending').style.display = 'block';
            document.getElementById('movies').style.display = 'none';
            els.trendingGrid.innerHTML = validMovies.map(createMovieCard).join('');

            // Add click listeners to trending cards
            els.trendingGrid.querySelectorAll('.movie-card').forEach(card => {
                card.addEventListener('click', () => {
                    const movieId = card.dataset.movieId;
                    showMovieDetails(movieId);
                });
            });
            
            hideLoading();
        } catch (err) {
            console.error('Failed to load uploaded movies:', err);
            hideLoading();
            showFallbackContent();
        }
    } else {
        els.trendingGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No movies uploaded yet.</p>';
        document.getElementById('trending').style.display = 'block';
        document.getElementById('movies').style.display = 'none';
    }
}

async function loadAnimations() {
    if (window.animationData) {
        const animationList = Object.values(window.animationData).map(animation => ({
            id: animation.id,
            title: animation.title,
            poster_path: animation.poster_path,
            release_date: "2021-01-01",
            vote_average: 8.5,
            media_type: "tv"
        }));

        document.getElementById('animation').style.display = 'block';
        document.getElementById('movies').style.display = 'none';
        document.getElementById('trending').style.display = 'none';
        els.animationGrid.innerHTML = animationList.map(createMovieCard).join('');

        // Add click listeners to animation cards
        els.animationGrid.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                showMovieDetails(movieId);
            });
        });
    } else {
        els.animationGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No animations available</p>';
    }
}

function showFallbackContent() {
    els.moviesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">Could not load movies. Please check your connection and refresh.</p>';
    els.loadMoreBtn.style.display = 'none';
    showNotification('Failed to load movies. Please refresh.');
}

async function searchMovies(query) {
    const data = await fetchFromAPI(`/search/movie?query=${encodeURIComponent(query)}&page=${currentPage}`);
    
    if (data?.results) {
        let results = data.results;

        const searchTerm = query.toLowerCase().trim();

        // === Force Real Series to Top of Search Results ===
        
        // Game of Thrones
        if (searchTerm.includes("game of thrones") || searchTerm.includes("got") || searchTerm.includes("thrones")) {
            const hasRealGOT = results.some(m => m.id === 1399);
            if (!hasRealGOT) {
                results.unshift({
                    id: 1399,
                    title: "Game of Thrones",
                    release_date: "2011-04-17",
                    vote_average: 8.4,
                    poster_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
                    overview: "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns.",
                    media_type: "tv"
                });
            }
        }

        // The Boys
        if (searchTerm.includes("boys") || searchTerm.includes("the boys")) {
            const hasRealBoys = results.some(m => m.id === 76479);
            if (!hasRealBoys) {
                results.unshift({
                    id: 76479,
                    title: "The Boys",
                    release_date: "2019-07-25",
                    vote_average: 8.4,
                    poster_path: "/stKGOm8UyhuLPR9sZLjs5AboUyT.jpg",
                    overview: "A group of vigilantes set out to take down corrupt superheroes with no more than blue-collar grit.",
                    media_type: "tv"
                });
            }
        }

        // Invincible - now in animationData, so check there
        if (searchTerm.includes("invincible")) {
            const hasRealInvincible = results.some(m => m.id === 95557);
            if (!hasRealInvincible && window.animationData && window.animationData[95557]) {
                const invincible = window.animationData[95557];
                results.unshift({
                    id: invincible.id,
                    title: invincible.title,
                    release_date: "2021-03-25",
                    vote_average: 8.7,
                    poster_path: invincible.poster_path,
                    overview: "Mark Grayson is a normal high school senior... except that his father is the most powerful superhero on the planet.",
                    media_type: "tv"
                });
            }
        }

        // Filter out unwanted fake Game of Thrones entries
        results = results.filter(movie => {
            const unwantedIds = [591278, 322484, 492606];
            return !unwantedIds.includes(movie.id);
        });

        if (currentPage === 1) {
            allMovies = results;
            displayMovies(allMovies);
        } else {
            allMovies.push(...results);
            appendMovies(results);
        }
    }
}

function handleSearch() {
    const q = els.searchInput.value.trim();
    if (!q) {
        currentSearch = '';
        currentPage = 1;
        loadPopularMovies();
        return;
    }
    currentSearch = q;
    currentPage = 1;
    searchMovies(q);
}

function handleFilterChange() {
    currentGenre = els.genreFilter.value;
    currentYear = els.yearFilter.value;
    currentRating = els.ratingFilter.value;
    currentPage = 1;
    applyFilters();
}

function applyFilters() {
    let filtered = [...allMovies];
    if (currentGenre) filtered = filtered.filter(m => m.genre_ids?.includes(Number(currentGenre)));
    if (currentYear) filtered = filtered.filter(m => m.release_date?.startsWith(currentYear));
    if (currentRating) filtered = filtered.filter(m => m.vote_average >= Number(currentRating));
    displayMovies(filtered);
}

function setViewMode(mode) {
    isGridView = mode === 'grid';
    els.gridView.classList.toggle('active', isGridView);
    els.listView.classList.toggle('active', !isGridView);
    if (els.gridViewTrending) els.gridViewTrending.classList.toggle('active', isGridView);
    if (els.listViewTrending) els.listViewTrending.classList.toggle('active', !isGridView);
    if (els.gridViewAnimation) els.gridViewAnimation.classList.toggle('active', isGridView);
    if (els.listViewAnimation) els.listViewAnimation.classList.toggle('active', !isGridView);

    els.moviesGrid.className = isGridView ? 'movies-grid' : 'movies-list';
    if (els.trendingGrid) els.trendingGrid.className = isGridView ? 'movies-grid' : 'movies-list';
    if (els.animationGrid) els.animationGrid.className = isGridView ? 'movies-grid' : 'movies-list';

    if (allMovies.length) displayMovies(allMovies);
}

function closeModal() {
    els.movieModal.style.display = 'none';
    currentMovie = null;
}

// UPDATED: Now supports series and animations from movies-data.js
async function showMovieDetails(movieId) {
    if (window.seriesData && window.seriesData[movieId]) {
        displaySeriesModal(window.seriesData[movieId]);
        return;
    }
    if (window.animationData && window.animationData[movieId]) {
        displaySeriesModal(window.animationData[movieId]);
        return;
    }
    
    const data = await fetchFromAPI(`/movie/${movieId}?append_to_response=credits`);
    if (data) displayMovieModal(data);
}

// NEW: Display series episodes with dropdown season selector
function displaySeriesModal(series) {
    currentMovie = series;

    document.getElementById('modalPoster').src = series.poster_path 
        ? IMAGE_BASE_URL + series.poster_path 
        : 'https://via.placeholder.com/300x450?text=No+Poster';

    document.getElementById('modalTitle').textContent = series.title || 'Series';
    document.getElementById('modalYear').textContent = 'Series';
    document.getElementById('modalRuntime').textContent = 'Multiple Episodes';
    document.getElementById('modalRating').textContent = '⭐ N/A';
    document.getElementById('modalOverview').textContent = 'Select a season to view episodes';

    let seasonsHTML = '<h3 style="margin:15px 0 10px;color:#e50914;">Seasons</h3>';
    
    if (series.seasons) {
        const seasonNumbers = Object.keys(series.seasons).sort((a, b) => a - b);
        
        // Create dropdown selector
        const seasonOptions = seasonNumbers.map(seasonNum => 
            `<option value="${seasonNum}">Season ${seasonNum}</option>`
        ).join('');
        
        seasonsHTML += `
            <div class="season-selector-container">
                <select id="seasonSelect" class="season-dropdown-select" onchange="displaySeasonEpisodes('${series.title}', this.value)">
                    <option value="">Select a season...</option>
                    ${seasonOptions}
                </select>
            </div>
            <div id="episodesContainer" class="episodes-container"></div>
        `;
    }

    document.getElementById('modalCast').innerHTML = seasonsHTML;

    // Hide the general download button for series since episodes have individual download buttons
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }

    // Update watchlist button state
    const watchlistBtn = document.querySelector('.watchlist-btn');
    if (watchlistBtn) {
        const watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
        const isInWatchlist = watchlist.includes(series.id);
        watchlistBtn.innerHTML = isInWatchlist ? '<i class="fas fa-minus"></i> Remove from Watchlist' : '<i class="fas fa-plus"></i> Add to Watchlist';
    }

    els.movieModal.style.display = 'flex';
}

// Display episodes for selected season
function displaySeasonEpisodes(seriesTitle, seasonNum) {
    const episodesContainer = document.getElementById('episodesContainer');
    
    if (!seasonNum) {
        episodesContainer.innerHTML = '';
        return;
    }
    
    // Find the series/animation data
    let series = null;
    for (const id in window.seriesData) {
        if (window.seriesData[id].title === seriesTitle) {
            series = window.seriesData[id];
            break;
        }
    }
    if (!series) {
        for (const id in window.animationData) {
            if (window.animationData[id].title === seriesTitle) {
                series = window.animationData[id];
                break;
            }
        }
    }
    
    if (!series || !series.seasons[seasonNum]) {
        episodesContainer.innerHTML = '<p style="color:#888;padding:1rem;">No episodes found for this season.</p>';
        return;
    }
    
    const episodes = series.seasons[seasonNum];
    const episodesList = Object.keys(episodes).sort((a, b) => a - b).map(epNum => `
        <div class="episode-item">
            <span class="episode-number">Episode ${epNum}</span>
            <button class="episode-download-btn" onclick="window.open('${episodes[epNum]}', '_blank')">
                <i class="fas fa-download"></i> Download
            </button>
        </div>
    `).join('');
    
    episodesContainer.innerHTML = `
        <div class="season-episodes-display">
            <h4 style="margin:1rem 0 0.5rem;color:#e50914;">Season ${seasonNum} Episodes</h4>
            ${episodesList}
        </div>
    `;
}

function displayMovieModal(movie) {
    currentMovie = movie;

    document.getElementById('modalPoster').src = movie.poster_path 
        ? IMAGE_BASE_URL + movie.poster_path 
        : 'https://via.placeholder.com/300x450?text=No+Poster';

    document.getElementById('modalTitle').textContent = movie.title;
    document.getElementById('modalYear').textContent = movie.release_date?.slice(0,4) || 'N/A';
    
    document.getElementById('modalRuntime').textContent = movie.runtime 
        ? `${Math.floor(movie.runtime / 60)}hr ${movie.runtime % 60}mins` 
        : 'N/A';

    document.getElementById('modalRating').textContent = movie.vote_average ? `⭐ ${movie.vote_average.toFixed(1)}` : 'N/A';
    document.getElementById('modalOverview').textContent = movie.overview || 'No overview available.';

    document.getElementById('modalGenres').innerHTML = movie.genres?.map(g => 
        `<span class="genre-tag">${g.name}</span>`
    ).join('') || '';

    const cast = movie.credits?.cast?.slice(0,6) || [];
    document.getElementById('modalCast').innerHTML = cast.map(c => `
        <div class="cast-member">
            <img src="${c.profile_path ? IMAGE_BASE_URL + c.profile_path : 'https://via.placeholder.com/60'}" alt="${c.name}">
            <p>${c.name}</p>
        </div>
    `).join('') || '<p>No cast info available.</p>';

    els.movieModal.style.display = 'flex';

    // Show the download button for movies and route through Download Manager
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = 'inline-flex';
        downloadBtn.onclick = () => {
            const movieId = movie.id;
            if (window.downloadLinks && window.downloadLinks[movieId]) {
                // Safely opens the standalone download manager in a fresh tab
                window.open(`download.html?id=${movieId}`, '_blank');
            } else {
                showNotification('Download link hasn\'t been mapped yet.');
            }
        };
    }

    // Update watchlist button state
    const watchlistBtn = document.querySelector('.watchlist-btn');
    if (watchlistBtn) {
        const watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
        const isInWatchlist = watchlist.includes(movie.id);
        watchlistBtn.innerHTML = isInWatchlist ? '<i class="fas fa-minus"></i> Remove from Watchlist' : '<i class="fas fa-plus"></i> Add to Watchlist';
    }
}

function displayMovies(movies) {
    if (!movies?.length) {
        els.moviesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No movies found</p>';
        els.loadMoreBtn.style.display = 'none';
        return;
    }

    els.moviesGrid.innerHTML = movies.map(createMovieCard).join('');
    els.loadMoreBtn.style.display = 'block';

    els.moviesGrid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const movieId = card.dataset.movieId;
            showMovieDetails(movieId);
        });
    });
}

function appendMovies(movies) {
    if (!movies?.length) return;
    els.moviesGrid.insertAdjacentHTML('beforeend', movies.map(createMovieCard).join(''));

    els.moviesGrid.querySelectorAll('.movie-card:not([data-listener-added])').forEach(card => {
        card.dataset.listenerAdded = 'true';
        card.addEventListener('click', () => {
            const movieId = card.dataset.movieId;
            showMovieDetails(movieId);
        });
    });
}

function createMovieCard(movie) {
    const poster = movie.poster_path 
        ? IMAGE_BASE_URL + movie.poster_path 
        : 'https://via.placeholder.com/200x300?text=No+Poster';

    const year = movie.release_date ? movie.release_date.slice(0, 4) : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

    return `
        <div class="movie-card" data-movie-id="${movie.id}">
            <img src="${poster}" alt="${movie.title}" class="movie-poster" loading="lazy">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span>${year}</span>
                    <span class="rating">⭐ ${rating}</span>
                </div>
            </div>
        </div>
    `;
}

function showNotification(message) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.textContent = message;
    n.style.cssText = `
        position:fixed;top:20px;right:20px;background:#e50914;color:white;
        padding:1rem 1.5rem;border-radius:8px;z-index:3000;
        animation:slideIn 0.3s ease;
    `;
    document.body.appendChild(n);
    setTimeout(() => {
        n.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => document.body.removeChild(n), 300);
    }, 3000);
}

if (!document.getElementById('notification-styles')) {
    const s = document.createElement('style');
    s.id = 'notification-styles';
    s.textContent = `
        @keyframes slideIn { from {transform:translateX(100%);opacity:0} to {transform:translateX(0);opacity:1} }
        @keyframes slideOut { from {transform:translateX(0);opacity:1} to {transform:translateX(100%);opacity:0} }
    `;
    document.head.appendChild(s);
}

// ─── Trailer Functions ─────────────────────────

async function getMovieTrailer(movieId, title, year) {
    try {
        const videosRes = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=en-US`);
        if (videosRes.ok) {
            const { results } = await videosRes.json();
            let t = results.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official);
            if (t) return { source: 'youtube', key: t.key, name: t.name || 'Official Trailer' };
            t = results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            if (t) return { source: 'youtube', key: t.key, name: t.name || 'Trailer' };
        }
        return null;
    } catch (err) {
        console.warn('Trailer fetch failed:', err);
        return null;
    }
}

function displayTrailer(trailer) {
    if (!trailer || trailer.source !== 'youtube') {
        showNotification('No trailer available');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'trailer-modal';
    modal.innerHTML = `
        <div class="trailer-modal-content">
            <span class="trailer-close">×</span>
            <div class="trailer-container">
                <iframe 
                    src="https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1" 
                    title="${trailer.name}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowfullscreen>
                </iframe>
            </div>
            <div class="trailer-info">
                <h3>${trailer.name || 'Trailer'}</h3>
                <button class="btn btn-primary" onclick="window.open('https://www.youtube.com/watch?v=${trailer.key}', '_blank')">
                    Watch on YouTube
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    };

    modal.querySelector('.trailer-close').onclick = close;
    modal.onclick = e => e.target === modal && close();
}

async function handleTrailer(movieId, title) {
    const year = 'N/A';
    const trailer = await getMovieTrailer(movieId, title, year);
    if (trailer) displayTrailer(trailer);
    else alert('No trailer available');
}
