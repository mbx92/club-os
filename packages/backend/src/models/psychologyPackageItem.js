'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PsychologyPackageItem extends Model {
    static associate(models) {
      // Belongs to Package
      PsychologyPackageItem.belongsTo(models.PsychologyPackage, {
        foreignKey: 'packageId',
        as: 'package'
      });

      // Belongs to TestType
      PsychologyPackageItem.belongsTo(models.PsychologyTestType, {
        foreignKey: 'testTypeId',
        as: 'testType'
      });
    }
  }

  PsychologyPackageItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    packageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'PsychologyPackages',
        key: 'id'
      }
    },
    testTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'PsychologyTestTypes',
        key: 'id'
      }
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'PsychologyPackageItem',
    tableName: 'PsychologyPackageItems',
    indexes: [
      {
        unique: true,
        fields: ['packageId', 'testTypeId'],
        name: 'psychology_package_items_unique'
      }
    ]
  });

  return PsychologyPackageItem;
};
