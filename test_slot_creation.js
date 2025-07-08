// Test script to verify slot creation logic
const dayjs = require('dayjs');

function testSlotCreation() {
  const dto = {
    date: '2025-07-15',
    start_time: '09:00',
    end_time: '17:00',
    session: 'morning',
    weekday: 'Monday',
    slot_duration: 30,
    patients_per_slot: 3,
  };

  console.log('Testing slot creation logic...');

  // ✅ 3. Use dayjs to split time
  const start = dayjs(`${dto.date}T${dto.start_time}`);
  const end = dayjs(`${dto.date}T${dto.end_time}`);

  // Get slot duration
  const slotDuration = dto.slot_duration || 30;

  console.log('Date/time parsing:', {
    date: dto.date,
    start_time: dto.start_time,
    end_time: dto.end_time,
    start: start.format('YYYY-MM-DD HH:mm'),
    end: end.format('YYYY-MM-DD HH:mm'),
    slotDuration,
  });

  const slots = [];
  let current = start;
  let iteration = 0;
  const maxIterations = 100; // Safety limit

  while (current.isBefore(end) && iteration < maxIterations) {
    const slotTime = current.format('HH:mm');
    const slotDate = new Date(dto.date);

    console.log(`Iteration ${iteration + 1}:`, {
      time: slotTime,
      date: slotDate.toISOString().split('T')[0],
      current: current.format('YYYY-MM-DD HH:mm'),
      isBeforeEnd: current.isBefore(end),
    });

    slots.push({
      slot_date: slotDate,
      slot_time: slotTime,
      session: dto.session,
    });

    current = current.add(slotDuration, 'minute');
    iteration++;
  }

  console.log('Generated slots:', slots);
  console.log('Total slots created:', slots.length);

  if (slots.length === 0) {
    console.error('❌ No slots were created!');

    // Check if the time range is valid
    if (start.isAfter(end) || start.isSame(end)) {
      console.error(
        '❌ Invalid time range: start time must be before end time',
      );
    }
  } else {
    console.log('✅ Slots created successfully!');
  }
}

testSlotCreation();
