'use strict';

const {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  setCategoryMovies,
  getLobbySections,
  getCompGroupsForMovie,
  replaceCompGroupsForMovie,
  getCategoryMembershipsForMovie,
  setCategoryMembershipsForMovie,
  getBorrowedCategoriesForMovie,
  setBorrowedCategoriesForMovie,
} = require('../services/categoryService');

const getCategories = async (req, res) => {
  try {
    const categories = await listCategories();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to list categories' });
  }
};

const getCategory = async (req, res) => {
  try {
    const category = await getCategoryById(req.params.id);
    res.status(200).json(category);
  } catch (error) {
    const status = error.message === 'Category not found' ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to get category' });
  }
};

const postCategory = async (req, res) => {
  try {
    const category = await createCategory(req.body || {});
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to create category' });
  }
};

const putCategory = async (req, res) => {
  try {
    const category = await updateCategory(req.params.id, req.body || {});
    res.status(200).json(category);
  } catch (error) {
    const status = error.message === 'Category not found' ? 404 : 400;
    res.status(status).json({ error: error.message || 'Failed to update category' });
  }
};

const removeCategory = async (req, res) => {
  try {
    await deleteCategory(req.params.id);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    const status = error.message === 'Category not found' ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to delete category' });
  }
};

const putCategoryMovies = async (req, res) => {
  try {
    const { movieIds } = req.body || {};
    const category = await setCategoryMovies(req.params.id, movieIds);
    res.status(200).json(category);
  } catch (error) {
    const status = error.message === 'Category not found' ? 404 : 400;
    res.status(status).json({ error: error.message || 'Failed to update category movies' });
  }
};

const getLobby = async (req, res) => {
  try {
    const sections = await getLobbySections();
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load lobby sections' });
  }
};

const getMovieCompGroups = async (req, res) => {
  try {
    const manualOnly =
      req.query.manualOnly === '1' || req.query.manualOnly === 'true';
    const groups = await getCompGroupsForMovie(req.params.movieId, {
      includeCategoryDerived: !manualOnly,
    });
    res.status(200).json(groups);
  } catch (error) {
    const status = error.message === 'Movie not found' ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to load comp groups' });
  }
};

const putMovieCompGroups = async (req, res) => {
  try {
    const groups = Array.isArray(req.body) ? req.body : req.body?.groups;
    const result = await replaceCompGroupsForMovie(req.params.movieId, groups);
    res.status(200).json(result);
  } catch (error) {
    const status = error.message === 'Movie not found' ? 404 : 400;
    res.status(status).json({ error: error.message || 'Failed to update comp groups' });
  }
};

const getMovieCategoryMemberships = async (req, res) => {
  try {
    const links = await getCategoryMembershipsForMovie(req.params.movieId);
    res.status(200).json(links);
  } catch (error) {
    const status = error.message === 'Movie not found' ? 404 : 500;
    res.status(status).json({
      error: error.message || 'Failed to load category memberships',
    });
  }
};

const putMovieCategoryMemberships = async (req, res) => {
  try {
    const categoryIds = Array.isArray(req.body)
      ? req.body
      : req.body?.categoryIds;
    const links = await setCategoryMembershipsForMovie(
      req.params.movieId,
      categoryIds
    );
    res.status(200).json(links);
  } catch (error) {
    const status = error.message === 'Movie not found' ? 404 : 400;
    res.status(status).json({
      error: error.message || 'Failed to update category memberships',
    });
  }
};

const getMovieBorrowedCategories = async (req, res) => {
  try {
    const links = await getBorrowedCategoriesForMovie(req.params.movieId);
    res.status(200).json(links);
  } catch (error) {
    const status = error.message === 'Movie not found' ? 404 : 500;
    res.status(status).json({
      error: error.message || 'Failed to load borrowed categories',
    });
  }
};

const putMovieBorrowedCategories = async (req, res) => {
  try {
    const categoryIds = Array.isArray(req.body)
      ? req.body
      : req.body?.categoryIds;
    const links = await setBorrowedCategoriesForMovie(
      req.params.movieId,
      categoryIds
    );
    res.status(200).json(links);
  } catch (error) {
    const status = error.message === 'Movie not found' ? 404 : 400;
    res.status(status).json({
      error: error.message || 'Failed to update borrowed categories',
    });
  }
};

module.exports = {
  getCategories,
  getCategory,
  postCategory,
  putCategory,
  removeCategory,
  putCategoryMovies,
  getLobby,
  getMovieCompGroups,
  putMovieCompGroups,
  getMovieCategoryMemberships,
  putMovieCategoryMemberships,
  getMovieBorrowedCategories,
  putMovieBorrowedCategories,
};
