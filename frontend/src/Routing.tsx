import { BrowserRouter as Router, Routes, Route, 
    // Redirect
} from "react-router-dom";
import MovieDetailsAdmin from './components/MovieDetailsAdmin/MovieDetailsAdmin';
import MovieSearch from './pages/MovieSearch/MovieSearch';
import MovieDetails from './pages/MovieDetails/MovieDetails';
import { CinemaLobby } from "./pages/MovieSearch/CinemaLobby/CinemaLobby";
import Layout from './components/Layout/Layout';

export const Routing = () => {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<CinemaLobby />} />
                    <Route path="/old" element={<MovieSearch />} />
                    <Route path="/old/movie/:id" element={<MovieDetailsAdmin />} />
                    <Route path="/movie/:id" element={<MovieDetails />} />
                </Routes>
            </Layout>
        </Router>
    );
}