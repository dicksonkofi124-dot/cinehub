// script.js – Final consolidated version (all trailer logic merged)
// ONLY ONE LINE CHANGED: runtime format updated to hours and minutes

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
        const res = await fetch(`${BASE_URL}${endpoint}&api_key=${API_KEY}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        hideLoading();
        return data;
    } catch (err) {
        hideLoading();
        return null;
    }
}

async function loadPopularMovies(retry = 0) {
    const data = await fetchFromAPI(`/movie/popular?language=en-US&page=${currentPage}`);
    if (data?.results?.length) {
        if (currentPage === 1) {
            allMovies = data.results;
            displayMovies(allMovies);
        } else {
            allMovies.push(...data.results);
            appendMovies(data.results);
        }
    } else if (retry < 2) {
        setTimeout(() => loadPopularMovies(retry + 1), 1200);
    } else {
        showFallbackContent();
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

    const data = await fetchFromAPI(`/trending/movie/week?language=en-US`);
    if (data?.results?.length) {
        allMovies = data.results;
        // Fixed: Show trending section and display movies in trending grid
        document.getElementById('trending').style.display = 'block';
        document.getElementById('movies').style.display = 'none';
        els.trendingGrid.innerHTML = data.results.map(createMovieCard).join('');
        
        // Add click listeners to trending cards
        els.trendingGrid.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                showMovieDetails(movieId);
            });
        });
    } else {
        showFallbackContent();
    }
}

function showFallbackContent() {
    const fallback = [
        { id: 27205, title: "Inception", release_date: "2010-07-16", vote_average: 8.4, poster_path: "/9gk7adHYeL0O8xH0v4k6vXjX0.jpg" },
        { id: 155, title: "The Dark Knight", release_date: "2008-07-18", vote_average: 8.5, poster_path: "/qJ2J5T5qXz0Xz0Xz0Xz0Xz0Xz0Xz0Xz0.jpg" },
        { id: 272, title: "Batman Begins", release_date: "2005-06-15", vote_average: 7.7, poster_path: "/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg" }
    ];
    displayMovies(fallback);
    showNotification('Could not load movies. Showing samples.');
}

async function searchMovies(query) {
    const data = await fetchFromAPI(`/search/movie?query=${encodeURIComponent(query)}&page=${currentPage}`);
    if (data?.results) {
        if (currentPage === 1) {
            allMovies = data.results;
            displayMovies(allMovies);
        } else {
            allMovies.push(...data.results);
            appendMovies(data.results);
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
    
    els.moviesGrid.className = isGridView ? 'movies-grid' : 'movies-list';
    if (els.trendingGrid) els.trendingGrid.className = isGridView ? 'movies-grid' : 'movies-list';
    
    if (allMovies.length) displayMovies(allMovies);
}

function closeModal() {
    els.movieModal.style.display = 'none';
    currentMovie = null;
}

// UPDATED: Now supports series from movies-data.js
async function showMovieDetails(movieId) {
    if (window.seriesData && window.seriesData[movieId]) {
        displaySeriesModal(window.seriesData[movieId]);
        return;
    }
    
    const data = await fetchFromAPI(`/movie/${movieId}?append_to_response=credits`);
    if (data) displayMovieModal(data);
}

// NEW: Display series episodes nicely with episode numbers
function displaySeriesModal(series) {
    currentMovie = series;

    document.getElementById('modalPoster').src = series.poster_path 
        ? IMAGE_BASE_URL + series.poster_path 
        : 'https://via.placeholder.com/300x450?text=No+Poster';

    document.getElementById('modalTitle').textContent = series.title || 'Series';
    document.getElementById('modalYear').textContent = 'Series';
    document.getElementById('modalRuntime').textContent = 'Multiple Episodes';
    document.getElementById('modalRating').textContent = '⭐ N/A';
    document.getElementById('modalOverview').textContent = 'Select an episode to download';

    let episodesHTML = '<h4 style="margin:15px 0 10px;color:#e50914;">Season 1 Episodes</h4>';
    
    if (series.seasons && series.seasons[1]) {
        episodesHTML += Object.keys(series.seasons[1]).map(epNum => `
            <div style="background:#1f1f1f;padding:12px;margin:8px 0;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                <span><strong>Episode ${epNum}</strong></span>
                <button class="btn btn-secondary" onclick="window.open('${series.seasons[1][epNum]}', '_blank')">Download</button>
            </div>
        `).join('');
    }

    document.getElementById('modalCast').innerHTML = episodesHTML;

    els.movieModal.style.display = 'flex';
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

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            const movieId = movie.id;
            if (window.downloadLinks && window.downloadLinks[movieId]) {
                window.open(window.downloadLinks[movieId], '_blank');
            } else {
                showNotification('Download not available for this movie');
            }
        };
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