/**
 * Restaurant Module - Models Index
 * 
 * Exports all restaurant-related models.
 * These models are registered with Sequelize in the main models/index.js
 * 
 * @module modules/restaurant/models
 */

// Model definitions (will be initialized by Sequelize)
module.exports = {
  Product: require('./product'),
  ProductCategory: require('./productCategory'),
  ProductExtra: require('./productExtra'),
  Location: require('./location'),
  RestaurantTable: require('./restaurantTable'),
  StockMovement: require('./stockMovement')
};
