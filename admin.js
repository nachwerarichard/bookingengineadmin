const API_BASE_URL = 'https://bookingenginebackend.onrender.com/api/bookings'; // Adjust if needed

// --- Utility Functions ---

/**
 * Displays a message to the user.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('success' or 'error').
 * @param {string} targetId - The ID of the element where the message should be displayed.
 */
function showMessage(message, type, targetId) {
    const messageDiv = document.getElementById(targetId);
    messageDiv.textContent = message;
    messageDiv.className = type; // 'success' or 'error'
    messageDiv.classList.remove('hidden');
    // Clear the message after a few seconds
    setTimeout(() => {
        messageDiv.classList.add('hidden');
        messageDiv.textContent = ''; // Clear the text as well
    }, 5000);
}

/**
 * Fetches data from the API and handles errors.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Optional fetch options.
 * @returns {Promise<object>} - The JSON response from the API.
 */
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error; // Re-throw to be caught by caller
    }
}

// --- Authentication ---

let authToken = localStorage.getItem('authToken'); // Load token from localStorage

/**
 * Handles user login.
 */
async function login() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const messageDiv = document.getElementById('login-message');
    const loginForm = document.getElementById('login-form');


    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!username || !password) {
        showMessage('Please enter both username and password.', 'error', 'login-message');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {  //  Ensure this endpoint matches your backend
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token; // Store the token
            localStorage.setItem('authToken', data.token); // Persist
            showMessage('Logged in successfully!', 'success', 'login-message');
            loginForm.classList.add('hidden');
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('dashboard-content').classList.remove('hidden');
            fetchBookings(); // Load bookings immediately after successful login

        } else {
            showMessage(data.message || 'Invalid credentials', 'error', 'login-message');
        }
    } catch (error) {
        showMessage('Failed to login. Please check your network.', 'error', 'login-message');
    } finally{
        loginForm.reset();
    }
}

/**
 * Logs the user out
 */
function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    document.getElementById('dashboard-content').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('login-form').reset();
    const bookingsTableBody = document.querySelector('#bookings-table tbody');
    bookingsTableBody.innerHTML = '<tr><td colspan="6">Please log in to view bookings.</td></tr>';

}

// --- Booking Management ---
/**
 * Fetches all bookings from the API and displays them in a table.
 */
async function fetchBookings() {
    const bookingsTableBody = document.querySelector('#bookings-table tbody');
    bookingsTableBody.innerHTML = '<tr><td colspan="7">Loading bookings...</td></tr>'; // Show loading state

    if (!authToken) {
      bookingsTableBody.innerHTML = '<tr><td colspan="7">Please log in to view bookings.</td></tr>';
      return;
    }
    try {
        const bookings = await fetchData(`${API_BASE_URL}/admin`, {
            headers: {
                'Authorization': `Bearer ${authToken}`, // Include the token
            },
        });

        if (!bookings || bookings.length === 0) {
            bookingsTableBody.innerHTML = '<tr><td colspan="7">No bookings found.</td></tr>';
            return;
        }

        // Clear the table and populate it with the fetched bookings
        bookingsTableBody.innerHTML = '';
        bookings.forEach(booking => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${booking._id}</td>
                <td>${booking.service}</td>
                <td>${new Date(booking.date).toLocaleDateString()}</td>
                <td>${booking.time}</td>
                <td>${booking.name}</td>
                <td>${booking.email}</td>
                <td>
                    <button class="edit-button" data-id="${booking._id}">Edit</button>
                    <button class="delete-button" data-id="${booking._id}">Delete</button>
                </td>
            `;
            bookingsTableBody.appendChild(row);
        });

        // Attach event listeners to the new buttons
        attachEventListenersToButtons();

    } catch (error) {
        bookingsTableBody.innerHTML = '<tr><td colspan="7">Failed to load bookings. Please check your network and backend.</td></tr>';
    }
}



/**
 * Handles editing a booking.
 * @param {string} id - The ID of the booking to edit.
 */
async function editBooking(id) {
    const editForm = document.getElementById('edit-form');
    const editIdInput = document.getElementById('edit-id');

     if (!authToken) {
        showMessage('Please log in to edit bookings.', 'error', 'edit-message');
        return;
    }

    try {
        const booking = await fetchData(`${API_BASE_URL}/${id}`, {
             headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });

        // Populate the edit form with the booking data
        editIdInput.value = booking._id;
        document.getElementById('edit-service').value = booking.service;
        document.getElementById('edit-date').value = new Date(booking.date).toISOString().split('T')[0];
        document.getElementById('edit-time').value = booking.time;
        document.getElementById('edit-name').value = booking.name;
        document.getElementById('edit-email').value = booking.email;

        // Show the edit form
        document.getElementById('edit-booking-form').classList.remove('hidden');
        editForm.removeEventListener('submit', handleEditSubmit); // Remove previous listener to avoid duplicates
        editForm.addEventListener('submit', handleEditSubmit);       // Attach the event listener

    } catch (error) {
        showMessage('Failed to fetch booking details for editing.', 'error', 'edit-message');
    }
}

/**
 * Handles the submission of the edit booking form.
 * @param {Event} event - The form submit event.
 */
async function handleEditSubmit(event) {
    event.preventDefault();

    const editId = document.getElementById('edit-id').value;
    const updatedBookingData = {
        service: document.getElementById('edit-service').value,
        date: document.getElementById('edit-date').value,
        time: document.getElementById('edit-time').value,
        name: document.getElementById('edit-name').value,
        email: document.getElementById('edit-email').value,
    };

     if (!authToken) {
         showMessage('Please log in to update bookings.', 'error', 'edit-message');
         return;
     }

    try {
        const response = await fetch(`${API_BASE_URL}/${editId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(updatedBookingData),
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Booking updated successfully!', 'success', 'edit-message');
            document.getElementById('edit-booking-form').classList.add('hidden'); // Hide form
            fetchBookings(); // Refresh the booking list
        } else {
            showMessage(data.message || 'Failed to update booking.', 'error', 'edit-message');
        }
    } catch (error) {
        showMessage('Error updating booking. Please check your network.', 'error', 'edit-message');
    }
}



/**
 * Handles deleting a booking.
 * @param {string} id - The ID of the booking to delete.
 */
async function deleteBooking(id) {
    if (!authToken) {
        showMessage('Please log in to delete bookings.', 'error', 'edit-message');
        return;
    }
    if (confirm('Are you sure you want to delete this booking?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE',
                 headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Booking deleted successfully!', 'success', 'edit-message');
                fetchBookings(); // Refresh the booking list
            } else {
                showMessage(data.message || 'Failed to delete booking.', 'error', 'edit-message');
            }
        } catch (error) {
            showMessage('Error deleting booking. Please check your network.', 'error', 'message');
        }
    }
}

/**
 * Handles the submission of the create booking form.
 */
async function createBookingManual() {
    const createService = document.getElementById('create-service').value;
    const createDate = document.getElementById('create-date').value;
    const createTime = document.getElementById('create-time').value;
    const createName = document.getElementById('create-name').value;
    const createEmail = document.getElementById('create-email').value;
    const messageDiv = document.getElementById('create-message');
    const createForm = document.getElementById('create-form');


    if (!createService || !createDate || !createTime || !createName || !createEmail) {
        showMessage('Please fill in all fields.', 'error', 'create-message');
        return;
    }

    const newBookingData = {
        service: createService,
        date: createDate,
        time: createTime,
        name: createName,
        email: createEmail,
    };
     if (!authToken) {
        showMessage('Please log in to create bookings.', 'error', 'create-message');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/manual`, {  // Use the /manual endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(newBookingData),
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Booking created successfully!', 'success', 'create-message');
            createForm.reset();
            fetchBookings(); // Refresh
        } else {
            showMessage(data.message || 'Failed to create booking.', 'error', 'create-message');
        }
    } catch (error) {
        showMessage('Error creating booking. Please check your network.', 'error', 'create-message');
    }
}



/**
 * Attaches event listeners to the dynamically created "Edit" and "Delete" buttons.
 */
function attachEventListenersToButtons() {
    const editButtons = document.querySelectorAll('.edit-button');
    const deleteButtons = document.querySelectorAll('.delete-button');

    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            editBooking(id);
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            deleteBooking(id);
        });
    });
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const createForm = document.getElementById('create-form');


    // Event listener for the login form
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        login();
    });

     createForm.addEventListener('submit', (event) => {
        event.preventDefault();
        createBookingManual();
    });


    // Check for existing token on page load
    if (authToken) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard-content').classList.remove('hidden');
        fetchBookings(); // Fetch bookings if logged in
    } else {
        document.getElementById('dashboard-content').classList.add('hidden');
        document.getElementById('login-section').classList.remove('hidden');
    }
});
