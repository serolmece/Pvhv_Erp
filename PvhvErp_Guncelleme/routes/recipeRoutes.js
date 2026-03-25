const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

// Get stocks for dropdown
router.get('/stocks', recipeController.getStocksForRecipe);

// Get recipes by product
router.get('/by-product/:urunId', recipeController.getRecipesByProduct);

// Get specific recipe details
router.get('/:id', recipeController.getRecipeDetails);

// Get all recipes
router.get('/', recipeController.getAllRecipes);

// Create Recipe
router.post('/', recipeController.createRecipe);

// Update Recipe
router.put('/:id', recipeController.updateRecipe);

// Delete Recipe
router.delete('/:id', recipeController.deleteRecipe);

module.exports = router;
