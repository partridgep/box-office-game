'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const {
  Category,
  Movie,
  MovieCategory,
  MovieCompGroup,
  MovieCompItem,
  sequelize,
} = db;

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveCompGroupLabel(group) {
  const plain = group.get ? group.get({ plain: true }) : group;
  return plain.label || plain.category?.comp_label || null;
}

function toLobbyMovie(movie) {
  const plain = movie.get ? movie.get({ plain: true }) : movie;
  return {
    id: plain.id,
    tmdbID: plain.tmdbID,
    imdbID: plain.imdbID,
    title: plain.title,
    year: plain.year,
    poster: plain.poster,
    plot: plain.plot,
    rated: plain.rated,
    released: plain.released,
    budget: plain.budget,
    director: plain.director,
    actors: plain.actors,
    genre: plain.genre,
  };
}

function toCompMovie(item) {
  const plain = item.get ? item.get({ plain: true }) : item;
  const rawMovie = plain.movie || plain.Movie || {};
  const movie = rawMovie.get ? rawMovie.get({ plain: true }) : rawMovie;
  return {
    id: movie.id,
    tmdbID: movie.tmdbID,
    imdbID: movie.imdbID,
    title: movie.title,
    year: movie.year,
    poster: movie.poster,
    domesticOpening: movie.domesticOpening,
    internationalOpening: movie.internationalOpening,
    domesticGross: movie.domesticGross,
    internationalGross: movie.internationalGross,
    rottenTomatoesScore: movie.rottenTomatoesScore,
    reason: plain.reason || null,
    sortOrder: plain.sort_order,
  };
}

async function listCategories() {
  const categories = await Category.findAll({
    order: [['sort_order', 'ASC'], ['createdAt', 'ASC']],
    include: [
      {
        model: MovieCategory,
        as: 'memberships',
        attributes: ['id'],
      },
    ],
  });

  return categories.map((category) => {
    const plain = category.get({ plain: true });
    return {
      id: plain.id,
      slug: plain.slug,
      lobby_label: plain.lobby_label,
      comp_label: plain.comp_label,
      sort_order: plain.sort_order,
      is_active: plain.is_active,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      membershipCount: plain.memberships?.length ?? 0,
    };
  });
}

async function getCategoryById(id) {
  const category = await Category.findByPk(id, {
    include: [
      {
        model: Movie,
        as: 'movies',
        through: { attributes: ['sort_order'] },
      },
    ],
  });

  if (!category) throw new Error('Category not found');

  const plain = category.get({ plain: true });
  const movies = (plain.movies || [])
    .map((movie) => ({
      ...toLobbyMovie(movie),
      sortOrder: movie.MovieCategory?.sort_order ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: plain.id,
    slug: plain.slug,
    lobby_label: plain.lobby_label,
    comp_label: plain.comp_label,
    sort_order: plain.sort_order,
    is_active: plain.is_active,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    movies,
  };
}

async function createCategory(data) {
  const lobbyLabel = data.lobby_label ?? null;
  const compLabel = data.comp_label ?? null;
  if (!lobbyLabel && !compLabel) {
    throw new Error('At least one of lobby_label or comp_label is required');
  }

  const slugSource = data.slug || lobbyLabel || compLabel;
  const slug = slugify(slugSource);
  if (!slug) throw new Error('Invalid slug');

  return Category.create({
    slug,
    lobby_label: lobbyLabel,
    comp_label: compLabel,
    sort_order: data.sort_order ?? 0,
    is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
  });
}

async function updateCategory(id, data) {
  const category = await Category.findByPk(id);
  if (!category) throw new Error('Category not found');

  const next = {
    lobby_label: data.lobby_label !== undefined ? data.lobby_label : category.lobby_label,
    comp_label: data.comp_label !== undefined ? data.comp_label : category.comp_label,
    sort_order: data.sort_order !== undefined ? data.sort_order : category.sort_order,
    is_active: data.is_active !== undefined ? Boolean(data.is_active) : category.is_active,
  };

  if (!next.lobby_label && !next.comp_label) {
    throw new Error('At least one of lobby_label or comp_label is required');
  }

  if (data.slug !== undefined) {
    const slug = slugify(data.slug);
    if (!slug) throw new Error('Invalid slug');
    next.slug = slug;
  }

  await category.update(next);
  return getCategoryById(id);
}

async function deleteCategory(id) {
  const deleted = await Category.destroy({ where: { id } });
  if (!deleted) throw new Error('Category not found');
}

async function setCategoryMovies(categoryId, movieIds = []) {
  const category = await Category.findByPk(categoryId);
  if (!category) throw new Error('Category not found');

  if (!Array.isArray(movieIds)) {
    throw new Error('movieIds must be an array');
  }

  if (movieIds.length > 0) {
    const found = await Movie.findAll({
      where: { id: { [Op.in]: movieIds } },
      attributes: ['id'],
    });
    if (found.length !== movieIds.length) {
      throw new Error('One or more movies were not found');
    }
  }

  await sequelize.transaction(async (transaction) => {
    await MovieCategory.destroy({
      where: { category_id: categoryId },
      transaction,
    });

    if (movieIds.length === 0) return;

    await MovieCategory.bulkCreate(
      movieIds.map((movieId, index) => ({
        category_id: categoryId,
        movie_id: movieId,
        sort_order: index,
      })),
      { transaction }
    );
  });

  return getCategoryById(categoryId);
}

async function getLobbySections() {
  const categories = await Category.findAll({
    where: {
      is_active: true,
      lobby_label: { [Op.ne]: null },
    },
    order: [['sort_order', 'ASC'], ['createdAt', 'ASC']],
    include: [
      {
        model: Movie,
        as: 'movies',
        through: { attributes: ['sort_order'] },
      },
    ],
  });

  return categories
    .map((category) => {
      const plain = category.get({ plain: true });
      if (!plain.lobby_label) return null;

      const movies = (plain.movies || [])
        .map((movie) => ({
          ...toLobbyMovie(movie),
          sortOrder: movie.MovieCategory?.sort_order ?? 0,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        id: plain.id,
        slug: plain.slug,
        label: plain.lobby_label,
        sortOrder: plain.sort_order,
        movies,
      };
    })
    .filter(Boolean);
}

const COMP_MOVIE_ATTRIBUTES = [
  'id',
  'tmdbID',
  'imdbID',
  'title',
  'year',
  'poster',
  'domesticOpening',
  'internationalOpening',
  'domesticGross',
  'internationalGross',
  'rottenTomatoesScore',
];

function mapManualCompGroup(group) {
  const plain = group.get ? group.get({ plain: true }) : group;
  const items = (plain.items || [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((item) => toCompMovie(item));

  return {
    id: plain.id,
    label: resolveCompGroupLabel(plain),
    categoryId: plain.category_id,
    sortOrder: plain.sort_order,
    source: 'manual',
    movies: items,
  };
}

async function getManualCompGroupsForMovie(movieId) {
  const groups = await MovieCompGroup.findAll({
    where: { subject_movie_id: movieId },
    order: [['sort_order', 'ASC'], ['createdAt', 'ASC']],
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'slug', 'comp_label', 'lobby_label'],
      },
      {
        model: MovieCompItem,
        as: 'items',
        include: [
          {
            model: Movie,
            as: 'movie',
            attributes: COMP_MOVIE_ATTRIBUTES,
          },
        ],
      },
    ],
  });

  return groups.map(mapManualCompGroup);
}

async function getCategoryDerivedCompGroups(movieId) {
  const memberships = await MovieCategory.findAll({
    where: { movie_id: movieId },
    include: [
      {
        model: Category,
        where: { is_active: true },
        required: true,
      },
    ],
    order: [['sort_order', 'ASC']],
  });

  const derived = [];

  for (const membership of memberships) {
    const category = membership.Category || membership.category;
    if (!category) continue;

    const label = category.comp_label || category.lobby_label;
    if (!label) continue;

    const peerMemberships = await MovieCategory.findAll({
      where: {
        category_id: category.id,
        movie_id: { [Op.ne]: movieId },
      },
      include: [
        {
          model: Movie,
          attributes: COMP_MOVIE_ATTRIBUTES,
          required: true,
        },
      ],
      order: [['sort_order', 'ASC']],
    });

    const movies = peerMemberships.map((peer) =>
      toCompMovie({
        reason: null,
        sort_order: peer.sort_order,
        movie: peer.Movie || peer.movie,
      })
    );

    if (movies.length === 0) continue;

    derived.push({
      id: `category:${category.id}`,
      label,
      categoryId: category.id,
      sortOrder: category.sort_order,
      source: 'category',
      movies,
    });
  }

  return derived.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

async function getCompGroupsForMovie(movieId, { includeCategoryDerived = true } = {}) {
  const movie = await Movie.findByPk(movieId);
  if (!movie) throw new Error('Movie not found');

  const manualGroups = await getManualCompGroupsForMovie(movieId);

  if (!includeCategoryDerived) {
    return manualGroups;
  }

  const derivedGroups = await getCategoryDerivedCompGroups(movieId);
  const usedManualIds = new Set();
  const merged = [];

  for (const derived of derivedGroups) {
    const override = manualGroups.find(
      (group) => group.categoryId === derived.categoryId
    );
    if (override) {
      merged.push(override);
      usedManualIds.add(override.id);
    } else {
      merged.push(derived);
    }
  }

  for (const manual of manualGroups) {
    if (!usedManualIds.has(manual.id)) {
      merged.push(manual);
    }
  }

  return merged;
}

async function replaceCompGroupsForMovie(movieId, groups = []) {
  const movie = await Movie.findByPk(movieId);
  if (!movie) throw new Error('Movie not found');

  if (!Array.isArray(groups)) {
    throw new Error('groups must be an array');
  }

  for (const group of groups) {
    const hasLabel = Boolean(group.label && String(group.label).trim());
    if (!hasLabel && !group.categoryId) {
      throw new Error('Each comp group requires a label or categoryId');
    }
  }

  const allMovieIds = groups.flatMap((group) =>
    (group.items || []).map((item) => item.movieId)
  );
  if (allMovieIds.length > 0) {
    const uniqueIds = [...new Set(allMovieIds)];
    const found = await Movie.findAll({
      where: { id: { [Op.in]: uniqueIds } },
      attributes: ['id'],
    });
    if (found.length !== uniqueIds.length) {
      throw new Error('One or more comp movies were not found');
    }
  }

  const categoryIds = [
    ...new Set(groups.map((group) => group.categoryId).filter(Boolean)),
  ];
  if (categoryIds.length > 0) {
    const foundCategories = await Category.findAll({
      where: { id: { [Op.in]: categoryIds } },
      attributes: ['id'],
    });
    if (foundCategories.length !== categoryIds.length) {
      throw new Error('One or more categories were not found');
    }
  }

  await sequelize.transaction(async (transaction) => {
    const existingGroups = await MovieCompGroup.findAll({
      where: { subject_movie_id: movieId },
      attributes: ['id'],
      transaction,
    });
    const existingIds = existingGroups.map((g) => g.id);

    if (existingIds.length > 0) {
      await MovieCompItem.destroy({
        where: { comp_group_id: { [Op.in]: existingIds } },
        transaction,
      });
      await MovieCompGroup.destroy({
        where: { subject_movie_id: movieId },
        transaction,
      });
    }

    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex];
      const createdGroup = await MovieCompGroup.create(
        {
          subject_movie_id: movieId,
          category_id: group.categoryId || null,
          label: group.label ? String(group.label).trim() : null,
          sort_order: group.sortOrder ?? groupIndex,
        },
        { transaction }
      );

      const items = group.items || [];
      if (items.length === 0) continue;

      await MovieCompItem.bulkCreate(
        items.map((item, itemIndex) => ({
          comp_group_id: createdGroup.id,
          movie_id: item.movieId,
          sort_order: item.sortOrder ?? itemIndex,
          reason: item.reason || null,
        })),
        { transaction }
      );
    }
  });

  return getCompGroupsForMovie(movieId, { includeCategoryDerived: false });
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  setCategoryMovies,
  getLobbySections,
  getCompGroupsForMovie,
  replaceCompGroupsForMovie,
};
