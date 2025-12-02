import { BrowserRouter as Router, Routes, Route, 
    // Redirect
} from "react-router-dom";
import MovieDetails from './components/MovieDetails/MovieDetails';
import MovieSearch from './pages/MovieSearch/MovieSearch';
import Layout from './components/Layout/Layout';

export const Routing = () => {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<MovieSearch />} />
                    <Route path="/movie/:id" element={<MovieDetails />} />
                </Routes>
            </Layout>
        </Router>
    );
}