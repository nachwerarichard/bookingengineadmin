document.addEventListener('DOMContentLoaded', fetchBookings);

async function fetchBookings() {
  const tableBody = document.getElementById('booking-table-body');
  const noBookingsMessage = document.getElementById('no-bookings-message');

  try {
    const response = await fetch('https://bookingenginebackend.onrender.com/api/bookings');
    const data = await response.json();

    tableBody.innerHTML = '';

    if (data.length === 0) {
      noBookingsMessage.classList.remove('hidden');
      return;
    }

    noBookingsMessage.classList.add('hidden');

    data.forEach(booking => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${booking.service}</td>
        <td>${booking.date}</td>
        <td>${booking.time}</td>
        <td>${booking.name}</td>
        <td>${booking.email}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    noBookingsMessage.textContent = 'Error fetching bookings.';
    noBookingsMessage.classList.remove('hidden');
  }
}
