'use strict';

/**
 * Location Controller - Restaurant Module
 * 
 * Handles location CRUD operations for multi-location support.
 * Includes stock summary, distance calculation, and GPS features.
 * 
 * @module modules/restaurant/controllers/locationController
 */

const { Location, Product, RestaurantTable, StockMovement, Tenant } = require('../../../models');
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');

/**
 * Get all locations with filters
 */
const getAllLocations = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 50,
      search,
      locationType,
      isActive,
      withStats
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Tenant filtering
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Search by name, code, or address
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Location type filter
    if (locationType) {
      where.locationType = locationType;
    }

    // Active filter
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Build include based on withStats
    const include = [];
    if (withStats === 'true') {
      include.push(
        { 
          model: Product, 
          as: 'products',
          attributes: ['id'],
          where: { isActive: true },
          required: false
        },
        { 
          model: RestaurantTable, 
          as: 'tables',
          attributes: ['id'],
          where: { isActive: true },
          required: false
        }
      );
    }

    const { count, rows: locations } = await Location.findAndCountAll({
      where,
      include,
      order: [
        [Location.sequelize.literal(`CASE WHEN "locationType" = 'main' THEN 0 ELSE 1 END`), 'ASC'],
        ['name', 'ASC']
      ],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    // Transform data if withStats
    const data = withStats === 'true' 
      ? locations.map(loc => ({
          ...loc.toJSON(),
          productCount: loc.products?.length || 0,
          tableCount: loc.tables?.length || 0,
          products: undefined,
          tables: undefined
        }))
      : locations;

    res.json({
      success: true,
      data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get location by ID
 */
const getLocationById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const location = await Location.findOne({
      where,
      include: [
        { 
          model: Product, 
          as: 'products',
          attributes: ['id', 'name', 'sku', 'stockQuantity', 'isActive'],
          limit: 20,
          order: [['name', 'ASC']]
        },
        { 
          model: RestaurantTable, 
          as: 'tables',
          attributes: ['id', 'tableNumber', 'capacity', 'status', 'isActive']
        }
      ]
    });

    if (!location) {
      throw createError('NOT_FOUND', 'Location not found');
    }

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new location
 */
const createLocation = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const locationData = {
      ...req.body,
      tenantId
    };

    // Check code uniqueness if provided
    if (locationData.code) {
      const existingCode = await Location.findOne({
        where: { tenantId, code: locationData.code }
      });

      if (existingCode) {
        throw createError('DUPLICATE_ENTRY', 'Location with this code already exists');
      }
    }

    // Check if trying to create another main location
    if (locationData.locationType === 'main') {
      const existingMain = await Location.getMainLocation(tenantId);
      if (existingMain) {
        throw createError('VALIDATION_ERROR', 'A main location already exists. Please use branch, outlet, or warehouse type.');
      }
    }

    const location = await Location.create(locationData);

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update location
 */
const updateLocation = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const location = await Location.findOne({ where });

    if (!location) {
      throw createError('NOT_FOUND', 'Location not found');
    }

    // Check code uniqueness if changed
    if (req.body.code && req.body.code !== location.code) {
      const existingCode = await Location.findOne({
        where: { 
          tenantId: location.tenantId, 
          code: req.body.code,
          id: { [Op.ne]: id }
        }
      });

      if (existingCode) {
        throw createError('DUPLICATE_ENTRY', 'Location with this code already exists');
      }
    }

    // Check if trying to change to main when one already exists
    if (req.body.locationType === 'main' && location.locationType !== 'main') {
      const existingMain = await Location.getMainLocation(location.tenantId);
      if (existingMain && existingMain.id !== id) {
        throw createError('VALIDATION_ERROR', 'A main location already exists');
      }
    }

    await location.update(req.body);

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete location (soft delete)
 */
const deleteLocation = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const location = await Location.findOne({ where });

    if (!location) {
      throw createError('NOT_FOUND', 'Location not found');
    }

    // Prevent deleting main location
    if (location.locationType === 'main') {
      throw createError('VALIDATION_ERROR', 'Cannot delete the main location');
    }

    // Check for associated products
    const productCount = await Product.count({ where: { locationId: id } });
    if (productCount > 0) {
      throw createError('VALIDATION_ERROR', `Cannot delete location with ${productCount} associated products. Please move or delete products first.`);
    }

    // Check for associated tables
    const tableCount = await RestaurantTable.count({ where: { locationId: id } });
    if (tableCount > 0) {
      throw createError('VALIDATION_ERROR', `Cannot delete location with ${tableCount} associated tables. Please move or delete tables first.`);
    }

    await location.destroy();

    res.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle location active status
 */
const toggleActive = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const location = await Location.findOne({ where });

    if (!location) {
      throw createError('NOT_FOUND', 'Location not found');
    }

    // Prevent deactivating main location
    if (location.locationType === 'main' && location.isActive) {
      throw createError('VALIDATION_ERROR', 'Cannot deactivate the main location');
    }

    await location.update({ isActive: !location.isActive });

    res.json({
      success: true,
      message: `Location ${location.isActive ? 'activated' : 'deactivated'} successfully`,
      data: location
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get location stock summary
 */
const getStockSummary = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const location = await Location.findOne({ where });

    if (!location) {
      throw createError('NOT_FOUND', 'Location not found');
    }

    // Get stock summary for this location
    const products = await Product.findAll({
      where: {
        locationId: id,
        isActive: true,
        trackInventory: true
      },
      attributes: [
        'id', 'name', 'sku', 'stockQuantity', 'minStockLevel', 'maxStockLevel'
      ],
      order: [['name', 'ASC']]
    });

    const summary = {
      totalProducts: products.length,
      totalStock: products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0),
      lowStockProducts: products.filter(p => p.stockQuantity <= p.minStockLevel).length,
      outOfStockProducts: products.filter(p => p.stockQuantity === 0).length,
      overStockProducts: products.filter(p => p.maxStockLevel && p.stockQuantity > p.maxStockLevel).length,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        minStockLevel: p.minStockLevel,
        maxStockLevel: p.maxStockLevel,
        status: p.stockQuantity === 0 ? 'out_of_stock' 
              : p.stockQuantity <= p.minStockLevel ? 'low_stock'
              : p.maxStockLevel && p.stockQuantity > p.maxStockLevel ? 'over_stock'
              : 'normal'
      }))
    };

    res.json({
      success: true,
      data: {
        location: {
          id: location.id,
          name: location.name,
          code: location.code,
          locationType: location.locationType
        },
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get locations with stock counts
 */
const getLocationsWithStock = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;

    const effectiveTenantId = isSuperAdmin ? req.query.tenantId : tenantId;

    if (!effectiveTenantId) {
      throw createError('VALIDATION_ERROR', 'Tenant ID is required');
    }

    const locations = await Location.getLocationsWithStockCount(effectiveTenantId);

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate distance between two locations
 */
const calculateDistance = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { fromId, toId } = req.params;

    const where = { tenantId };
    if (isSuperAdmin) {
      delete where.tenantId;
    }

    const [fromLocation, toLocation] = await Promise.all([
      Location.findOne({ where: { ...where, id: fromId } }),
      Location.findOne({ where: { ...where, id: toId } })
    ]);

    if (!fromLocation || !toLocation) {
      throw createError('NOT_FOUND', 'One or both locations not found');
    }

    if (!fromLocation.hasGPS() || !toLocation.hasGPS()) {
      throw createError('VALIDATION_ERROR', 'Both locations must have GPS coordinates');
    }

    const distance = fromLocation.distanceTo(toLocation);

    res.json({
      success: true,
      data: {
        from: {
          id: fromLocation.id,
          name: fromLocation.name,
          coordinates: fromLocation.getCoordinates()
        },
        to: {
          id: toLocation.id,
          name: toLocation.name,
          coordinates: toLocation.getCoordinates()
        },
        distance: {
          km: Math.round(distance * 100) / 100,
          meters: Math.round(distance * 1000)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  toggleActive,
  getStockSummary,
  getLocationsWithStock,
  calculateDistance
};
