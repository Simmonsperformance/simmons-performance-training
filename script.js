const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.site-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

// --------------------------------------------------
// SIMMONS PERFORMANCE TRAINING APPOINTMENT BOOKING
// --------------------------------------------------

const BOOKING_API_URL =
  'https://abbvzklzlsvyytlwhnmg.supabase.co/functions/v1/book-appointment';

const BOOKING_PUBLIC_KEY =
  'sb_publishable_z19sIM2NBEycqwlB5rR3ag_0ZJzFKx9';

const bookingForm = document.querySelector('#booking-form');
const bookingStatus = document.querySelector('#booking-status');
const bookingModal = document.querySelector('#booking-modal');
const bookingDate = document.querySelector('#booking-date');
const bookingTime = document.querySelector('#booking-time');
const bookingSubmit = bookingForm?.querySelector('.booking-submit');
const bookingServiceField = document.querySelector('#booking-service');
const bookingPriceField = document.querySelector('#booking-price');
const bookingSelectedService = document.querySelector('#booking-selected-service');
const bookingSelectedPrice = document.querySelector('#booking-selected-price');
const houseCallAddressField = document.querySelector('#house-call-address-field');
const houseCallAddressInput = document.querySelector('#house-call-address');
const bookingCalendarDays = document.querySelector('#booking-calendar-days');
const bookingCalendarHeading = document.querySelector('#booking-calendar-heading');
const bookingMonthPrevious = document.querySelector('#booking-month-previous');
const bookingMonthNext = document.querySelector('#booking-month-next');

const serviceKeys = {
  '1-on-1 Session': 'one-on-one',
  'Group Speed Training': 'group-speed',
  '3x Weekly Package': 'three-times-weekly',
  'House Call Session': 'house-call'
};

let availableSlots = [];
let calendarMonth;

const localDateString = (date) => {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
};

const today = new Date();
today.setHours(0, 0, 0, 0);

if (bookingDate) {
  bookingDate.min = localDateString(today);
}

calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const phoenixParts = (iso) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Phoenix',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(iso));

  const get = (type) =>
    parts.find((part) => part.type === type)?.value || '';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`
  };
};

const callBookingApi = async (payload) => {
  const response = await fetch(BOOKING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: BOOKING_PUBLIC_KEY,
      Authorization: `Bearer ${BOOKING_PUBLIC_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `Booking service returned ${response.status}.`
    );
  }

  return data;
};

// Accommodate the slot ID field names returned by the API.
const getSlotId = (slot) => {
  return String(
    slot?.id ??
    slot?.slot_id ??
    slot?.booking_slot_id ??
    ''
  );
};

// The dropdown stores the slot's index in availableSlots.
const getSelectedSlot = () => {
  if (!bookingTime || bookingTime.value === '') {
    return null;
  }

  const index = Number(bookingTime.value);

  return Number.isInteger(index) &&
    index >= 0 &&
    index < availableSlots.length
    ? availableSlots[index]
    : null;
};

// --------------------------------------------------
// LIVE AVAILABILITY
// --------------------------------------------------

const loadAvailability = async () => {
  if (!bookingTime || !bookingDate || !bookingServiceField) {
    return;
  }

  bookingTime.replaceChildren(
    new Option('Loading available times…', '')
  );
  bookingTime.disabled = true;

  const serviceKey = serviceKeys[bookingServiceField.value];

  if (!bookingDate.value || !serviceKey) {
    availableSlots = [];
    bookingTime.replaceChildren(
      new Option('Choose a date first', '')
    );
    updateBookingReview();
    return;
  }

  const date = bookingDate.value;

  // Phoenix uses UTC-7 year-round.
  const start = `${date}T00:00:00-07:00`;

  const next = new Date(`${date}T12:00:00-07:00`);
  next.setUTCDate(next.getUTCDate() + 1);

  const endDate =
    `${next.getUTCFullYear()}-` +
    `${String(next.getUTCMonth() + 1).padStart(2, '0')}-` +
    `${String(next.getUTCDate()).padStart(2, '0')}T00:00:00-07:00`;

  try {
    const data = await callBookingApi({
      action: 'availability',
      service_key: serviceKey,
      start,
      end: endDate
    });

    availableSlots = (data.slots || []).filter((slot) => {
      return slot.starts_at &&
        phoenixParts(slot.starts_at).date === date;
    });

    bookingTime.replaceChildren(
      new Option(
        availableSlots.length
          ? 'Choose an available time'
          : 'No times available — choose another date',
        ''
      )
    );

    availableSlots.forEach((slot, index) => {
      const { time } = phoenixParts(slot.starts_at);

      const label = new Date(
        `2000-01-01T${time}:00`
      ).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      });

      bookingTime.add(new Option(label, String(index)));
    });

    bookingTime.disabled = availableSlots.length === 0;

    if (!availableSlots.length) {
      bookingStatus.textContent =
        'No open appointments on that date. Please select another date.';
    } else {
      bookingStatus.textContent =
        'Live availability loaded. Select an open time to continue.';
    }
  } catch (error) {
    console.error('Availability lookup failed:', error);

    availableSlots = [];

    bookingTime.replaceChildren(
      new Option('Availability unavailable', '')
    );

    bookingTime.disabled = true;

    bookingStatus.textContent =
      'We could not load live availability. Please refresh and try again.';
  }

  updateBookingReview();
};

// --------------------------------------------------
// CALENDAR
// --------------------------------------------------

const renderBookingCalendar = () => {
  if (
    !bookingCalendarHeading ||
    !bookingCalendarDays ||
    !bookingMonthPrevious ||
    !calendarMonth
  ) {
    return;
  }

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  bookingCalendarHeading.textContent =
    calendarMonth.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric'
    });

  bookingCalendarDays.replaceChildren();

  bookingMonthPrevious.disabled =
    year === today.getFullYear() &&
    month === today.getMonth();

  for (let i = 0; i < firstWeekday; i++) {
    const spacer = document.createElement('span');
    spacer.className = 'booking-calendar-empty';
    spacer.setAttribute('aria-hidden', 'true');
    bookingCalendarDays.append(spacer);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const value = localDateString(date);
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'booking-calendar-day';
    button.textContent = String(day);
    button.disabled = date < today;

    button.setAttribute(
      'aria-label',
      date.toLocaleDateString(undefined, { dateStyle: 'full' })
    );

    button.setAttribute(
      'aria-pressed',
      String(bookingDate.value === value)
    );

    if (bookingDate.value === value) {
      button.classList.add('is-selected');
    }

    button.addEventListener('click', () => {
      bookingDate.value = value;

      bookingCalendarDays
        .querySelectorAll('.booking-calendar-day')
        .forEach((calendarButton) => {
          const selected = calendarButton === button;

          calendarButton.classList.toggle('is-selected', selected);
          calendarButton.setAttribute(
            'aria-pressed',
            String(selected)
          );
        });

      loadAvailability();
      updateBookingReview();
    });

    bookingCalendarDays.append(button);
  }
};

bookingMonthPrevious?.addEventListener('click', () => {
  calendarMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() - 1,
    1
  );

  renderBookingCalendar();
});

bookingMonthNext?.addEventListener('click', () => {
  calendarMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    1
  );

  renderBookingCalendar();
});

// --------------------------------------------------
// OPEN AND CLOSE BOOKING MODAL
// --------------------------------------------------

const openBookingModal = (service = '', price = '') => {
  if (!bookingForm || !bookingModal) {
    return;
  }

  bookingForm.reset();

  bookingDate.min = localDateString(today);

  calendarMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  availableSlots = [];

  bookingTime.replaceChildren(
    new Option('Choose a date first', '')
  );

  bookingTime.disabled = true;

  renderBookingCalendar();

  bookingStatus.textContent = '';

  bookingSubmit.disabled = false;
  bookingSubmit.innerHTML =
    'CONFIRM APPOINTMENT <span>↗</span>';

  bookingServiceField.value = service;
  bookingPriceField.value = price;

  bookingSelectedService.textContent = service;
  bookingSelectedPrice.textContent = price;

  const isHouseCall = service === 'House Call Session';
  if (houseCallAddressField) {
    houseCallAddressField.hidden = !isHouseCall;
    houseCallAddressField.style.display = isHouseCall ? '' : 'none';
  }
  if (houseCallAddressInput) {
    houseCallAddressInput.required = isHouseCall;
    houseCallAddressInput.value = '';
  }

  if (service === '3x Weekly Package') {
    bookingStatus.textContent =
      'The 3x Weekly Package requires three separate appointments. ' +
      'Please contact simmonsperftraining@gmail.com to arrange the package.';
  }

  updateBookingReview();

  bookingModal.showModal();

  bookingForm.elements.athleteName?.focus();
};

document.querySelectorAll('[data-booking-open]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    openBookingModal(
      trigger.dataset.service || '',
      trigger.dataset.price || ''
    );
  });
});

document.querySelectorAll('[data-booking-close]').forEach((button) => {
  button.addEventListener('click', () => bookingModal?.close());
});

bookingModal?.addEventListener('click', (event) => {
  if (event.target === bookingModal) {
    bookingModal.close();
  }
});

// --------------------------------------------------
// BOOKING SUMMARY
// --------------------------------------------------

const updateBookingReview = () => {
  if (!bookingForm) {
    return;
  }

  const data = new FormData(bookingForm);
  const slot = getSelectedSlot();
  const phoenix = slot ? phoenixParts(slot.starts_at) : null;

  const setReview = (field, value) => {
    const element = bookingForm.querySelector(
      `[data-booking-review="${field}"]`
    );

    if (element) {
      element.textContent = value;
    }
  };

  setReview('service', data.get('service') || 'Not selected');
  setReview('price', data.get('price') || 'Not selected');
  setReview(
    'date',
    phoenix?.date || bookingDate?.value || 'Not selected'
  );

  setReview(
    'time',
    phoenix?.time
      ? new Date(`2000-01-01T${phoenix.time}:00`)
          .toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
          })
      : 'Not selected'
  );

  setReview(
    'payment',
    data.get('paymentMethod') || 'Not selected'
  );
};

bookingForm?.addEventListener('input', updateBookingReview);

bookingForm?.addEventListener('change', (event) => {
  if (event.target === bookingDate) {
    loadAvailability();
  }

  updateBookingReview();
});

bookingTime?.addEventListener('change', updateBookingReview);

updateBookingReview();

// --------------------------------------------------
// SUBMIT APPOINTMENT
// Reserve through Supabase before attempting email.
// Email configuration must not block the reservation.
// --------------------------------------------------

bookingForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Prevent repeated clicks from creating duplicate appointment notifications.
  if (bookingForm.dataset.submitting === 'true') return;

  const formData = new FormData(bookingForm);

  const service = String(
    formData.get('service') || ''
  ).trim();

  const serviceKey = serviceKeys[service];

  if (service === '3x Weekly Package') {
    bookingStatus.textContent =
      'The 3x Weekly Package requires three separate appointments. ' +
      'Please contact simmonsperftraining@gmail.com to arrange scheduling.';

    return;
  }

  const slot = getSelectedSlot();
  const slotId = getSlotId(slot);

  if (!serviceKey || !slot || !slotId) {
    bookingStatus.textContent =
      'Please select a service, date, and an available appointment time.';

    return;
  }

  const athleteName = String(
    formData.get('athleteName') || ''
  ).trim();

  const houseCallAddress = String(formData.get('houseCallAddress') || '').trim();
  if (serviceKey === 'house-call' && !houseCallAddress) {
    bookingStatus.textContent = 'Please enter the full address for the house-call appointment.';
    houseCallAddressInput?.focus();
    return;
  }

  const enteredAthleteEmail = String(
    formData.get('athleteEmail') || ''
  ).trim();

  const parentName = String(
    formData.get('parentName') || ''
  ).trim();

  const parentEmail = String(
    formData.get('parentEmail') || ''
  ).trim();

  const parentPhone = String(
    formData.get('parentPhone') || ''
  ).trim();

  const athletePhone = String(
    formData.get('athletePhone') || ''
  ).trim();

  const athleteEmail = enteredAthleteEmail || parentEmail;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!athleteName) {
    bookingStatus.textContent = 'Please enter the athlete name.';
    bookingForm.elements.athleteName?.focus();
    return;
  }

  const athleteAge = Number(formData.get('athleteAge'));
  if (athleteAge < 18 && !parentName) {
    bookingStatus.textContent =
      'For athletes under 18, please enter the parent/guardian full name. The phone number can be entered for either the athlete or parent/guardian.';
    bookingForm.elements.parentName?.focus();
    return;
  }

  if (athleteAge < 18 && !parentEmail) {
    bookingStatus.textContent =
      'For athletes under 18, please enter the parent/guardian email. The phone number can be entered for either the athlete or parent/guardian.';
    bookingForm.elements.parentEmail?.focus();
    return;
  }

  if (!athleteEmail || !emailPattern.test(athleteEmail)) {
    bookingStatus.textContent =
      'Please enter a valid athlete or parent/guardian email address.';

    bookingForm.elements.athleteEmail?.focus();
    return;
  }

  if (parentEmail && !emailPattern.test(parentEmail)) {
    bookingStatus.textContent =
      'Please enter a valid parent/guardian email address, or leave it blank.';

    bookingForm.elements.parentEmail?.focus();
    return;
  }

  if (!athletePhone && !parentPhone) {
    bookingStatus.textContent =
      'Please enter a phone number for either the athlete or parent/guardian.';

    bookingForm.elements.athletePhone?.focus();
    return;
  }

  const selected = phoenixParts(slot.starts_at);
  const appointmentDate = selected.date;
  const appointmentTime = selected.time;

  bookingForm.dataset.submitting = 'true';
  bookingSubmit.disabled = true;
  bookingSubmit.textContent = 'RESERVING APPOINTMENT…';

  bookingStatus.textContent =
    'Checking availability and reserving your appointment…';

  // Once Supabase returns a booking ID, never treat a later confirmation-page
  // or browser-storage issue as a failed reservation. That would refresh the
  // calendar and make the already-reserved time disappear from this page.
  let reservationCreated = false;
  let createdBookingId = '';

  try {
    // FIRST: reserve the actual appointment through Supabase.
    const result = await callBookingApi({
      action: 'book',
      slot_id: slotId,
      service_key: serviceKey,
      athlete_name: athleteName,
      athlete_age: athleteAge,
      sport: String(formData.get('sport') || '').trim(),
      position: String(formData.get('position') || '').trim(),
      athlete_email: athleteEmail,
      guardian_name: parentName,
      guardian_email: parentEmail,
      athlete_phone: athletePhone,
      guardian_phone: parentPhone,
      training_goals: String(formData.get('goals') || '').trim(),

      notes: [
        `Experience: ${formData.get('experience') || 'Not provided'}`,
        `Fitness: ${formData.get('fitness') || 'Not provided'}`,
        `Injury history: ${formData.get('injuryHistory') || 'Not provided'}`,
        `Payment method: ${formData.get('paymentMethod') || 'Not selected'}`,
        `Additional notes: ${formData.get('notes') || 'None'}`,
        ...(serviceKey === 'house-call' ? [`House-call address: ${houseCallAddress}`] : [])
      ].join('\n')
    });

    if (!result.booking_id) {
      throw new Error(
        'The booking service did not return a booking confirmation.'
      );
    }

    reservationCreated = true;
    createdBookingId = String(result.booking_id);

    const confirmationMessage =
      'Your appointment is reserved. Contact simmonsperftraining@gmail.com if you need to make a change.';

    const confirmationDetails = {
      bookingId: result.booking_id,
      service,
      price: String(formData.get('price') || ''),
      date: appointmentDate,

      time: new Date(
        `2000-01-01T${appointmentTime}:00`
      ).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      }),

      paymentMethod: String(
        formData.get('paymentMethod') || ''
      ),
      paymentInstructions: String(formData.get('paymentMethod') || '').toLowerCase().includes('zelle')
        ? {
            recipient: 'Kaleb Simmons',
            phone: '480-504-9992',
            amount: String(formData.get('price') || ''),
            note: `${athleteName} - ${service}`
          }
        : null,

      athleteName,
      parentName,
      parentEmail,
      athleteEmail,
      emailNotice: 'Your appointment is reserved.',
      confirmedAt: new Date().toISOString()
    };

    // Business notification is sent only by the Supabase booking function.
    // Do not send a second EmailJS message from the browser.
    const emailNotice = 'Your request was saved. The business will review it shortly.';

    // Save details for the confirmation page.
    confirmationDetails.emailNotice = emailNotice;

    try {
      localStorage.setItem(
  'sptBookingConfirmation',
  JSON.stringify(confirmationDetails)
);

sessionStorage.setItem(
  'sptBookingConfirmation',
  JSON.stringify(confirmationDetails)
);
    } catch (storageError) {
      console.warn(
        'Could not save confirmation details:',
        storageError
      );
    }

    // Redirect ONLY after Supabase confirms the reservation.
    window.location.assign('booking-confirmation.html');

  } catch (error) {
    console.error('Appointment reservation flow issue:', error);

    // If the server already created the booking, keep the customer moving to
    // the confirmation page instead of reloading availability and losing the
    // selected time. A booking ID is the authoritative success signal.
    if (reservationCreated && createdBookingId) {
      const confirmationUrl = new URL('booking-confirmation.html', window.location.href);
      try {
        const saved = JSON.parse(
          sessionStorage.getItem('sptBookingConfirmation') ||
          localStorage.getItem('sptBookingConfirmation') ||
          '{}'
        );
        saved.bookingId = createdBookingId;
        saved.service = service;
        saved.price = String(formData.get('price') || '');
        saved.date = appointmentDate;
        saved.athleteName = athleteName;
        saved.parentName = parentName;
        saved.parentEmail = parentEmail;
        saved.athleteEmail = athleteEmail;
        saved.paymentMethod = String(formData.get('paymentMethod') || '');
        saved.emailNotice = 'Your request was saved. The business will review it shortly.';
        saved.confirmedAt = new Date().toISOString();
        localStorage.setItem('sptBookingConfirmation', JSON.stringify(saved));
        sessionStorage.setItem('sptBookingConfirmation', JSON.stringify(saved));
      } catch (storageError) {
        console.warn('Could not refresh confirmation details:', storageError);
      }
      window.location.href = confirmationUrl.href;
      return;
    }

    bookingStatus.textContent =
      `We could not reserve this appointment: ${
        error.message || 'Please try again.'
      }`;

    bookingForm.dataset.submitting = 'false';
    bookingSubmit.disabled = false;

    bookingSubmit.innerHTML =
      'CONFIRM APPOINTMENT <span>↗</span>';

    // Refresh availability, but keep the customer's selection if the slot
    // is still open. A validation or network error should not erase their work.
    const previouslySelectedSlotId = slotId;
    await loadAvailability();
    const stillAvailableIndex = availableSlots.findIndex(
      (availableSlot) => getSlotId(availableSlot) === previouslySelectedSlotId
    );
    if (stillAvailableIndex >= 0 && bookingTime) {
      bookingTime.value = String(stillAvailableIndex);
      updateBookingReview();
    }
  }
});

// --------------------------------------------------
// PURCHASE AND PAYMENT MODAL
// Orders and purchase emails are handled by the Supabase Edge Functions.
// --------------------------------------------------

const purchaseModal = document.querySelector('#purchase-modal');
const purchaseNotificationForm = document.querySelector('#purchase-notification-form');
const purchaseModalName = document.querySelector('#purchase-modal-name');
const purchaseModalPrice = document.querySelector('#purchase-modal-price');
const zelleExactAmount = document.querySelector('#zelle-exact-amount');
const zellePaymentPanel = document.querySelector('#zelle-payment-panel');
const cashPaymentPanel = document.querySelector('#cash-payment-panel');
const purchaseModalConfirmation = document.querySelector('#purchase-modal-confirmation');
const purchaseModalConfirm = document.querySelector('#purchase-modal-confirm');
const purchaseModalCancel = document.querySelector('#purchase-modal-cancel');
const copyZellePhone = document.querySelector('#copy-zelle-phone');
const copyZelleStatus = document.querySelector('#copy-zelle-status');
const purchaseNotificationStatus = document.querySelector('#purchase-notification-status');
const zellePhoneNumber = document.querySelector('#zelle-phone-number');

const paymentMethodInputs =
  document.querySelectorAll('input[name="paymentMethod"]');

let activePurchase = null;
const nutritionIntake = document.querySelector('#nutrition-intake');

const formatCents = (amountCents, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(Number(amountCents) / 100);

const updatePaymentMethod = () => {
  const selectedMethod =
    document.querySelector('input[name="paymentMethod"]:checked')?.value ||
    'zelle';

  const isZelle = selectedMethod === 'zelle';

  if (zellePaymentPanel) {
    zellePaymentPanel.hidden = !isZelle;
  }

  if (cashPaymentPanel) {
    cashPaymentPanel.hidden = isZelle;
  }

  if (purchaseModalConfirm) {
    purchaseModalConfirm.textContent = 'SUBMIT PURCHASE';
  }
};

document.querySelectorAll('[data-purchase-trigger]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const card = trigger.closest(
      '.price-card, .online-category, .product-detail-panel'
    );

    const name = card?.querySelector('h3')?.innerText
      .replace(/\s+/g, ' ')
      .trim();

    const price = card?.querySelector(
      '.price, .product-meta > span, .product-detail-purchase > span'
    )?.textContent
      .replace(/\s+/g, ' ')
      .trim();

    if (!name || !price) {
      return;
    }

    const detailProductIds = {
      'meal-prep-grocery-guide': 'meal-prep-grocery-guide',
      'athlete-nutrition-guide': 'athlete-nutrition-guide',
      'muscle-building-nutrition-guide': 'muscle-building-nutrition-guide',
      'fat-loss-nutrition-guide': 'fat-loss-nutrition-guide'
    };
    const cardProductIds = {
      'Strength Programs': 'strength-programs',
      'Speed & Agility Programs': 'speed-agility-programs',
      'Sport-Specific Performance Programs': 'football-performance-programs',
      'General Fitness Programs': 'general-fitness-programs',
      'Training + Nutrition Bundles': 'training-nutrition-bundles'
    };
    const productId = card?.dataset.productId || detailProductIds[card?.id] || cardProductIds[name];
    if (!productId) {
      purchaseNotificationStatus.textContent =
        'This item is not connected to the secure order catalog yet.';
      return;
    }

    activePurchase = {
      name,
      price,
      productId,
      idempotencyKey: crypto.randomUUID()
    };

    purchaseModalName.textContent = name;
    purchaseModalPrice.textContent = price;
    zelleExactAmount.textContent = price;

    document.querySelector('#payment-method-picker').hidden = false;
    purchaseModalConfirmation.hidden = true;
    purchaseModalConfirm.hidden = false;
    purchaseModalConfirm.disabled = false;

    copyZelleStatus.textContent = '';
    purchaseNotificationStatus.textContent = '';

    purchaseNotificationForm.reset();
    if (nutritionIntake) {
      const isNutritionGuide = productId === 'personalized-athlete-nutrition-guide';
      nutritionIntake.hidden = !isNutritionGuide;
      nutritionIntake.querySelectorAll('input, select, textarea').forEach((field) => {
        field.required = isNutritionGuide && ['nutritionAthleteName','nutritionAthleteEmail','nutritionAthletePhone','nutritionAge','nutritionGoal','nutritionSport','nutritionHeight','nutritionWeight','nutritionTrainingDays','nutritionAcknowledgement'].includes(field.name);
      });
    }

    const zelleRadio = document.querySelector(
      'input[name="paymentMethod"][value="zelle"]'
    );

    if (zelleRadio) {
      zelleRadio.checked = true;
    }

    updatePaymentMethod();

    purchaseModal.showModal();
    purchaseModalConfirm.focus();
  });
});

paymentMethodInputs.forEach((input) => {
  input.addEventListener('change', updatePaymentMethod);
});

copyZellePhone?.addEventListener('click', async () => {
  const phone = zellePhoneNumber.textContent.trim();

  try {
    await navigator.clipboard.writeText(phone);
    copyZelleStatus.textContent = 'Zelle phone number copied.';
  } catch {
    const temporaryInput = document.createElement('textarea');

    temporaryInput.value = phone;
    temporaryInput.setAttribute('readonly', '');
    temporaryInput.className = 'copy-buffer';

    document.body.append(temporaryInput);
    temporaryInput.select();

    const copied = document.execCommand('copy');

    temporaryInput.remove();

    copyZelleStatus.textContent = copied
      ? 'Zelle phone number copied.'
      : 'Select and copy the number above.';
  }
});

// --------------------------------------------------
// SUBMIT PURCHASE EMAILS
// --------------------------------------------------

purchaseNotificationForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!activePurchase) {
    return;
  }

  const orderConfig = window.SPT_ORDER_CONFIG;
  if (!orderConfig?.createOrderUrl || !orderConfig?.publishableKey) {
    purchaseNotificationStatus.textContent =
      'Secure ordering is not configured. No order was created.';
    return;
  }

  const selectedMethod =
    document.querySelector('input[name="paymentMethod"]:checked')?.value ||
    'zelle';

  const formData = new FormData(purchaseNotificationForm);

  const customerName = String(
    formData.get('customerName') || ''
  ).trim();

  const customerEmail = String(
    formData.get('customerEmail') || ''
  ).trim();

  const customerPhone = String(
    formData.get('customerPhone') || ''
  ).trim();

  const paymentMethod =
    selectedMethod === 'zelle'
      ? 'Zelle'
      : 'In-Person / Cash';

  let customerNotes = String(formData.get('customerNotes') || '').trim();
  if (activePurchase.productId === 'personalized-athlete-nutrition-guide') {
    const age = Number(formData.get('nutritionAge'));
    const guardianName = String(formData.get('nutritionGuardianName') || '').trim();
    const guardianEmail = String(formData.get('nutritionGuardianEmail') || '').trim();
    const athleteEmail = String(formData.get('nutritionAthleteEmail') || '').trim();
    const emailLooksValid = (value) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
    if (!emailLooksValid(athleteEmail)) {
      purchaseNotificationStatus.textContent = 'Enter a valid athlete email address for delivery of the personalized guide.';
      purchaseModalConfirm.disabled = false;
      updatePaymentMethod();
      return;
    }
    if (age < 18 && (formData.get('nutritionGuardianConsent') !== 'yes' || !guardianName || !emailLooksValid(guardianEmail))) {
      purchaseNotificationStatus.textContent = 'For athletes under 18, enter the parent or legal guardian name and email, and confirm their approval.';
      purchaseModalConfirm.disabled = false;
      updatePaymentMethod();
      return;
    }
    const intakeFields = [
      ['Athlete full name', 'nutritionAthleteName'], ['Athlete email', 'nutritionAthleteEmail'], ['Athlete phone number', 'nutritionAthletePhone'],
      ['Parent / legal guardian name', 'nutritionGuardianName'], ['Parent / legal guardian email', 'nutritionGuardianEmail'], ['Athlete age', 'nutritionAge'], ['Nutrition goal', 'nutritionGoal'], ['Sport / position / event', 'nutritionSport'],
      ['Height', 'nutritionHeight'], ['Current weight', 'nutritionWeight'], ['Target weight', 'nutritionTargetWeight'],
      ['Training days per week', 'nutritionTrainingDays'], ['Training / practice times', 'nutritionTrainingTimes'],
      ['Daily activity outside training', 'nutritionActivity'], ['Food allergies / intolerances', 'nutritionAllergies'],
      ['Dietary needs / restrictions / cultural food preferences', 'nutritionDietaryNeeds'], ['Favorite / disliked foods', 'nutritionFoodPreferences'],
      ['Typical meals and snacks', 'nutritionTypicalMeals'], ['Hydration habits', 'nutritionHydration'], ['Sleep and recovery', 'nutritionSleep'],
      ['Supplements', 'nutritionSupplements'], ['Medical conditions / medications / clinician restrictions', 'nutritionMedical'],
      ['Race / ethnicity (optional)', 'nutritionRace'], ['Food budget / cooking access', 'nutritionBudget'], ['Other nutrition context', 'nutritionOther']
    ];
    const lines = intakeFields.map(([label, name]) => `${label}: ${String(formData.get(name) || '').trim() || 'Not provided'}`);
    lines.unshift('PERSONALIZED ATHLETE NUTRITION INTAKE');
    lines.push(`Under-18 guardian acknowledgement: ${age < 18 ? 'Yes' : 'Not applicable'}`);
    lines.push('Nutrition education acknowledgement: Yes');
    customerNotes = [customerNotes, lines.join('\\n')].filter(Boolean).join('\\n\\n');
    if (customerNotes.length > 9500) {
      purchaseNotificationStatus.textContent = 'Your intake is too long to submit. Please shorten some optional answers and try again.';
      purchaseModalConfirm.disabled = false;
      updatePaymentMethod();
      return;
    }
  }

  purchaseModalConfirm.disabled = true;
  purchaseModalConfirm.textContent = 'CREATING ORDER...';

  purchaseNotificationStatus.textContent =
    'Creating a pending order securely...';

  try {
    const response = await fetch(orderConfig.createOrderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: orderConfig.publishableKey,
        Authorization: `Bearer ${orderConfig.publishableKey}`
      },
      body: JSON.stringify({
        product_id: activePurchase.productId,
        idempotency_key: activePurchase.idempotencyKey,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        payment_method: paymentMethod,
        notes: customerNotes
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `Order service returned ${response.status}.`);
    }

    purchaseModalConfirmation.textContent =
      `Order ${result.order_id} is pending payment verification. ` +
      `The price is ${formatCents(result.amount_cents, result.currency)}. ` +
      (result.business_notification_status === 'sent'
        ? 'The business notification was sent.'
        : 'The order was saved, but the business notification needs attention.');

    purchaseNotificationStatus.textContent = '';

    zellePaymentPanel.hidden = true;
    cashPaymentPanel.hidden = true;

    document.querySelector('#payment-method-picker').hidden = true;

    purchaseModalConfirmation.hidden = false;
    purchaseModalConfirm.hidden = true;

    purchaseModalCancel.focus();

  } catch (error) {
    console.error('Secure digital order creation failed:', error);

    purchaseNotificationStatus.textContent =
      error instanceof Error
        ? error.message
        : 'The order could not be created. Please try again.';

    purchaseModalConfirm.disabled = false;
    updatePaymentMethod();
  }
});

purchaseModalCancel?.addEventListener('click', () => {
  purchaseModal.close();
});

purchaseModal?.addEventListener('click', (event) => {
  if (event.target === purchaseModal) {
    purchaseModal.close();
  }
});