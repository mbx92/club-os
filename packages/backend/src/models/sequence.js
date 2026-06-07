'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Sequence extends Model {
    static associate(models) {
      // No associations needed
    }
  }
  
  Sequence.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    prefix: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    currentValue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    step: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    padLength: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 6
    },
    resetPeriod: {
      type: DataTypes.ENUM('none', 'daily', 'monthly', 'yearly'),
      defaultValue: 'monthly'
    },
    lastResetDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Sequence',
    tableName: 'Sequences'
  });
  
  return Sequence;
};
