'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Follow extends Model {
    static associate(models) {
      Follow.belongsTo(models.User, { as: 'follower', foreignKey: 'follower_id' });
      Follow.belongsTo(models.User, { as: 'following', foreignKey: 'following_id' });
    }
  }

  Follow.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    follower_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    following_id: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: "Follow",
    tableName: "follows",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['follower_id', 'following_id'],
        name: 'unique_follower_following'
      }
    ]
  });

  return Follow;
};