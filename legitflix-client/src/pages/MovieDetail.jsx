import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { jellyfinService } from '../services/jellyfin';
import MovieHero from '../components/movie/MovieHero';

// Hardcoded for development testing if no ID provided
const TEST_MOVIE_ID = 'fe1b4f44-88aa-295b-0937-2303530f2c00'; // Replace with a valid ID from your server
const TEST_USER_ID = '4d033700-1123-42e6-9430-802c67623910'; // Replace with valid User ID

export default function MovieDetail() {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                // Get ID from URL or fallback to test ID
                const movieId = id || TEST_MOVIE_ID;

                const response = await jellyfinService.getItem(TEST_USER_ID, movieId);
                setItem(response.data);
            } catch (error) {
                console.error("Failed to fetch movie:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return <div className="text-white p-10">Loading...</div>;
    if (!item) return <div className="text-white p-10">Movie not found</div>;

    return (
        <div className="min-h-screen bg-lf-bg text-white">
            <MovieHero item={item} />
            {/* Cast & Similar sections will go here */}
        </div>
    );
}
