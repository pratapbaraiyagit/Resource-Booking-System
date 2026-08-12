import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService, AvailabilityRule } from './availability.service';
import { parseISO, differenceInMinutes } from 'date-fns';

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AvailabilityService],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSlots', () => {
    const standardRule: AvailabilityRule = { dayOfWeek: 1, startLocalTime: '09:00', endLocalTime: '17:00' };

    it('1. Normal day (No DST boundary)', () => {
      // 2023-10-09 is a Monday
      const slots = service.generateSlots('2023-10-09', 'Europe/London', 'Europe/London', [standardRule]);
      
      expect(slots.length).toBe(16); // 8 hours * 2
      expect(slots[0].startLocal).toBe('09:00');
      expect(slots[15].endLocal).toBe('17:00');
    });

    it('2. Europe/London winter date (GMT, +00:00)', () => {
      // 2023-01-02 is a Monday (Winter, GMT)
      const slots = service.generateSlots('2023-01-02', 'Europe/London', 'Europe/London', [standardRule]);
      
      expect(slots.length).toBe(16);
      expect(slots[0].startUtc).toBe('2023-01-02T09:00:00.000Z'); // 09:00 GMT is 09:00 UTC
      expect(slots[0].startLocal).toBe('09:00');
    });

    it('3. Europe/London summer date (BST, +01:00)', () => {
      // 2023-07-03 is a Monday (Summer, BST)
      const slots = service.generateSlots('2023-07-03', 'Europe/London', 'Europe/London', [standardRule]);
      
      expect(slots.length).toBe(16);
      expect(slots[0].startUtc).toBe('2023-07-03T08:00:00.000Z'); // 09:00 BST is 08:00 UTC
      expect(slots[0].startLocal).toBe('09:00');
    });

    it('4. DST spring-forward date (America/New_York)', () => {
      // Spring forward in NY is March 12, 2023 (Sunday). 02:00 skips to 03:00.
      const springRule: AvailabilityRule = { dayOfWeek: 0, startLocalTime: '00:00', endLocalTime: '10:00' };
      const slots = service.generateSlots('2023-03-12', 'America/New_York', 'America/New_York', [springRule]);
      
      // Normally 10 hours = 20 slots. But 1 hour is skipped (2 AM to 3 AM).
      // Local time goes 00:00, 00:30, 01:00, 01:30, 03:00, 03:30...
      // Let's verify no invalid slots exist and the total UTC duration is exactly 9 hours (18 slots).
      expect(slots.length).toBe(18); // 9 hours elapsed in UTC!

      // Verify the 01:30 slot ends at 03:00 local!
      const beforeTransition = slots.find(s => s.startLocal === '01:30');
      expect(beforeTransition).toBeDefined();
      expect(beforeTransition?.endLocal).toBe('03:00'); // The 30 mins after 01:30 local is 03:00 local!

      // 7. No invalid/missing slots check
      slots.forEach(slot => {
        expect(slot.startLocal).not.toBe('02:00');
        expect(slot.startLocal).not.toBe('02:30');
      });
    });

    it('5. DST fall-back date (America/New_York)', () => {
      // Fall back in NY is Nov 5, 2023 (Sunday). 02:00 goes back to 01:00.
      const fallRule: AvailabilityRule = { dayOfWeek: 0, startLocalTime: '00:00', endLocalTime: '10:00' };
      const slots = service.generateSlots('2023-11-05', 'America/New_York', 'America/New_York', [fallRule]);
      
      // Normally 10 hours = 20 slots. But 1 hour is repeated (1 AM to 2 AM happens twice).
      // Local time goes 00:00, 00:30, 01:00, 01:30, (fall back) 01:00, 01:30, 02:00...
      // Total UTC duration is 11 hours (22 slots).
      expect(slots.length).toBe(22);

      // Verify 6. No duplicate slots in UTC (each slot is strictly 30 elapsed minutes in UTC)
      const utcStarts = new Set(slots.map(s => s.startUtc));
      expect(utcStarts.size).toBe(22); // All UTC starts must be completely unique

      let previousEndUtc: string | null = null;
      slots.forEach(slot => {
        const start = parseISO(slot.startUtc);
        const end = parseISO(slot.endUtc);
        
        // Slot is exactly 30 minutes in UTC absolute time
        expect(differenceInMinutes(end, start)).toBe(30);

        // Adjacent slots do not overlap
        if (previousEndUtc) {
          expect(slot.startUtc).toBe(previousEndUtc);
        }
        previousEndUtc = slot.endUtc;
      });
    });

    it('8. Correct UTC conversion to a different display timezone', () => {
      // Resource is NY (Mon-Fri 09:00 - 17:00)
      // Displaying in Europe/London
      const slots = service.generateSlots('2023-10-09', 'America/New_York', 'Europe/London', [standardRule]);
      
      // On Oct 9, NY is EDT (-04:00). London is BST (+01:00). Difference is 5 hours.
      // NY 09:00 EDT -> 13:00 UTC -> 14:00 BST in London.
      expect(slots[0].startLocal).toBe('14:00');
      expect(slots[15].endLocal).toBe('22:00');

      // The UTC time should strictly represent NY 09:00 EDT (13:00 UTC)
      expect(slots[0].startUtc).toBe('2023-10-09T13:00:00.000Z');
    });
  });
});
