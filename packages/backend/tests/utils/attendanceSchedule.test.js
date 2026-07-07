'use strict';

const {
  getOvernightShiftAnchorDate,
  getScheduleMetricsForEvent,
  isPlausibleCheckIn,
  isPlausibleCheckout,
  shouldSwapOvernightTimes,
} = require('../../src/utils/attendanceSchedule');

const TZ = 'Asia/Jakarta';

describe('overnight staff attendance schedule helpers', () => {
  const overnightSchedule = {
    date: '2025-07-08',
    shiftStart: '21:00',
    shiftEnd: '06:00',
    isOff: false,
  };

  test('21:00 Jul 7 is check-in candidate for overnight shift stored on checkout date', () => {
    const event = new Date('2025-07-07T14:00:00.000Z'); // 21:00 WIB
    const metrics = getScheduleMetricsForEvent(event, overnightSchedule, TZ);

    expect(isPlausibleCheckIn(metrics, 120)).toBe(true);
    expect(isPlausibleCheckout(metrics, 120)).toBe(false);
    expect(getOvernightShiftAnchorDate(overnightSchedule, event, TZ)).toBe('2025-07-07');
  });

  test('06:00 Jul 8 is checkout candidate and anchors to Jul 7 shift start date', () => {
    const event = new Date('2025-07-07T23:00:00.000Z'); // 06:00 WIB Jul 8
    const metrics = getScheduleMetricsForEvent(event, overnightSchedule, TZ);

    expect(isPlausibleCheckout(metrics, 120)).toBe(true);
    expect(isPlausibleCheckIn(metrics, 120)).toBe(false);
    expect(getOvernightShiftAnchorDate(overnightSchedule, event, TZ)).toBe('2025-07-07');
  });

  test('reversed overnight times should be swapped', () => {
    const checkIn = new Date('2025-07-07T23:00:00.000Z'); // 06:00 WIB Jul 8
    const checkOut = new Date('2025-07-07T14:00:00.000Z'); // 21:00 WIB Jul 7

    expect(shouldSwapOvernightTimes(checkIn, checkOut, overnightSchedule, TZ)).toBe(true);
  });

  test('correct chronological overnight times should not swap', () => {
    const checkIn = new Date('2025-07-07T14:00:00.000Z'); // 21:00 WIB Jul 7
    const checkOut = new Date('2025-07-07T23:00:00.000Z'); // 06:00 WIB Jul 8

    expect(shouldSwapOvernightTimes(checkIn, checkOut, overnightSchedule, TZ)).toBe(false);
  });
});
