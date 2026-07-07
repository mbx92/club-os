/**
 * Gym Module Routes
 */
const membersRoutes = require('./member/member.routes');
const trainerRoutes = require('./trainer/trainer.routes');
const transactionRoutes = require('./transaction/transaction.routes');
const checkInRoutes = require('./checkIn/checkIn.routes');
const { servicePlansRouter, activeServicesRouter, serviceManagementRouter } = require('./service');
const { reportRoutes } = require('./report');
const { dashboardRoutes } = require('./dashboard');
const ptSessionsRoutes = require('./pt/ptSessions.routes');
const cashRegisterRoutes = require('./cashRegister/cashRegister.routes');
const staffAttendanceRoutes = require('./staffAttendance/staffAttendance.routes');
const employeeScheduleRoutes = require('./employeeSchedule/employeeSchedule.routes');
const employeeScheduleTemplateRoutes = require('./employeeSchedule/employeeScheduleTemplate.routes');
const shiftRoutes = require('./shift/shift.routes');
const schedulePeriodRoutes = require('./schedulePeriod/schedulePeriod.routes');

module.exports = {
  membersRoutes,
  trainerRoutes,
  transactionRoutes,
  checkInRoutes,
  servicePlansRouter,
  activeServicesRouter,
  serviceManagementRouter,
  reportRoutes,
  dashboardRoutes,
  ptSessionsRoutes,
  cashRegisterRoutes,
  staffAttendanceRoutes,
  employeeScheduleRoutes,
  employeeScheduleTemplateRoutes,
  shiftRoutes,
  schedulePeriodRoutes
};
