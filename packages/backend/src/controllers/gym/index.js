/**
 * Gym Module Controllers
 */
const memberController = require('./member/memberController');
const trainerController = require('./trainer/trainerController');
const checkInController = require('./checkIn/checkInController');

module.exports = {
  memberController,
  trainerController,
  checkInController
};
