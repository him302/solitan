import { computeOpenState, localTime, toHoursDto, type HoursRow } from './open-state';

// 2026-01-05 is a Monday. IST = UTC+05:30.
const monday = (utc: string): Date => new Date(`2026-01-05T${utc}Z`);
const MON_9_TO_20: HoursRow[] = [{ weekday: 1, openTime: '09:00', closeTime: '20:00' }];

describe('open state (Asia/Kolkata, server clock)', () => {
  it('converts UTC to IST including the weekday rollover', () => {
    // 20:00 UTC Monday is 01:30 Tuesday IST.
    expect(localTime(monday('20:00:00'))).toEqual({ weekday: 2, minutes: 90 });
    expect(localTime(monday('04:00:00'))).toEqual({ weekday: 1, minutes: 570 }); // 09:30 IST
  });

  it('is open within hours, closed outside; open AT open-time, closed AT close-time', () => {
    expect(computeOpenState('active', MON_9_TO_20, monday('04:00:00'))).toBe('open'); // 09:30 IST
    expect(computeOpenState('active', MON_9_TO_20, monday('03:30:00'))).toBe('open'); // 09:00 IST
    expect(computeOpenState('active', MON_9_TO_20, monday('02:59:00'))).toBe('closed'); // 08:29 IST
    expect(computeOpenState('active', MON_9_TO_20, monday('14:30:00'))).toBe('closed'); // 20:00 IST
  });

  it('is closed on a weekday with no hours when other days are configured', () => {
    const tuesdayIst = new Date('2026-01-06T05:00:00Z');
    expect(computeOpenState('active', MON_9_TO_20, tuesdayIst)).toBe('closed');
  });

  it('is "unconfigured" — never "open" — when no hours exist', () => {
    expect(computeOpenState('active', [], monday('05:00:00'))).toBe('unconfigured');
  });

  it('a non-active salon is closed regardless of hours', () => {
    expect(computeOpenState('pending', MON_9_TO_20, monday('04:00:00'))).toBe('closed');
    expect(computeOpenState('suspended', MON_9_TO_20, monday('04:00:00'))).toBe('closed');
  });

  it('expands rows to seven days, marking absent weekdays closed', () => {
    const dto = toHoursDto(MON_9_TO_20);
    expect(dto.days).toHaveLength(7);
    expect(dto.configured).toBe(true);
    expect(dto.days[1]).toEqual({
      weekday: 1,
      isOpen: true,
      openTime: '09:00',
      closeTime: '20:00',
    });
    expect(dto.days[0]?.isOpen).toBe(false);
    expect(toHoursDto([]).configured).toBe(false);
  });
});
