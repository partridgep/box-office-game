export const searchMovies = async (search: string) => {
    const response = await fetch(`/api/search-movies?search=${search}`);
    if (!response.ok) throw new Error('Failed to fetch movies');
    return response.json();
};

export const getMovieDetails = async (imdbID: string) => {
    const response = await fetch(`/api/movie?id=${imdbID}`);
    if (!response.ok) throw new Error('Failed to fetch movie');
    return response.json();
};

export const saveMovieDetails = async (movieData: Record<string, any>) => {
    const response = await fetch('/api/movie/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(movieData),
    });

    if (!response.ok) {
        throw new Error('Failed to save movie details');
    }

    return response.json();
};

export const deleteMovie = async (imdbID: string) => {
    const response = await fetch(`/api/movie/delete?imdbID=${imdbID}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to delete movie');
    }

    return response.json();
};

export const fetchBoxOfficeData = async (imdbID: string) => {
    const response = await fetch(`/api/box-office?id=${imdbID}`);
    if (!response.ok) throw new Error('Failed to fetch box office data');
    return response.json();
};

export const getSavedMovies = async () => {
    const response = await fetch(`/api/all-movies`);
    if (!response.ok) throw new Error('Failed to fetch movies');
    return response.json();
};
