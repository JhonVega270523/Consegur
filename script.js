// Global variables for managing state and data
let currentUser = null;
let users = JSON.parse(localStorage.getItem('users')) || [];
let services = JSON.parse(localStorage.getItem('services')) || [];
let reports = JSON.parse(localStorage.getItem('reports')) || [];
let notifications = JSON.parse(localStorage.getItem('notifications')) || [];

// SignaturePad instances
let signaturePadClient = null;
let signaturePadTechnician = null;


// Initialize an admin user if none exists
if (users.length === 0) {
    users.push({ id: generateId(), username: 'admin', password: 'adminpassword', role: 'admin' });
    saveUsers();
}

// Function to generate unique IDs
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Save data to localStorage
function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function saveServices() {
    localStorage.setItem('services', JSON.stringify(services));
}

function saveReports() {
    localStorage.setItem('reports', JSON.stringify(reports));
}

function saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

// --- Reemplazo de Alerts y Confirms nativos ---
function showAlert(message) {
    document.getElementById('customAlertModalBody').textContent = message;
    const alertModal = new bootstrap.Modal(document.getElementById('customAlertModal'));
    alertModal.show();
}

function showConfirm(message, callback) {
    document.getElementById('customConfirmModalBody').textContent = message;
    const confirmModalElement = document.getElementById('customConfirmModal');
    const confirmModal = new bootstrap.Modal(confirmModalElement);

    const confirmBtn = document.getElementById('customConfirmBtn');

    // Remove any existing event listeners to prevent duplicates
    confirmBtn.onclick = null; // Clear previous click handlers

    // Add new click listener for the Confirm button
    confirmBtn.onclick = () => {
        callback(true);
        confirmModal.hide();
        // Remove the 'hidden.bs.modal' listener if confirmed
        confirmModalElement.removeEventListener('hidden.bs.modal', hiddenHandler);
    };

    // Add a listener for when the modal is hidden (e.g., by Cancel button or close icon)
    const hiddenHandler = function() {
        // If the confirmBtn.onclick is still set, it means 'Confirm' was not clicked
        // and the modal was dismissed by other means (e.g., Cancel, backdrop click)
        if (confirmBtn.onclick) {
            callback(false);
        }
        confirmModalElement.removeEventListener('hidden.bs.modal', hiddenHandler); // Clean up
    };
    confirmModalElement.addEventListener('hidden.bs.modal', hiddenHandler);

    confirmModal.show();
}


// --- UI Display Functions ---

function showLogin() {
    document.getElementById('login-section').classList.remove('d-none');
    document.getElementById('admin-dashboard-section').classList.add('d-none');
    document.getElementById('employee-dashboard-section').classList.add('d-none');
    document.getElementById('nav-login').classList.remove('d-none');
    document.getElementById('nav-logout').classList.add('d-none');
    document.getElementById('nav-admin-dashboard').classList.add('d-none');
    document.getElementById('nav-employee-dashboard').classList.add('d-none');
    currentUser = null;
    // Clear login fields on showing login
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    updateNotificationBadges(); // Clear badges on logout
}

function showAdminDashboard() {
    if (currentUser && currentUser.role === 'admin') {
        document.getElementById('login-section').classList.add('d-none');
        document.getElementById('admin-dashboard-section').classList.remove('d-none');
        document.getElementById('employee-dashboard-section').classList.add('d-none');
        document.getElementById('nav-login').classList.add('d-none');
        document.getElementById('nav-logout').classList.remove('d-none');
        document.getElementById('nav-admin-dashboard').classList.remove('d-none');
        document.getElementById('nav-employee-dashboard').classList.add('d-none');
        renderUserList();
        renderAdminServicesList();
        populateAssignServiceDropdown();
        populateAssignTechnicianDropdown();
        populateTechnicianDropdowns();
        renderAssignedServicesList();
        renderReportsList();
        renderAdminNotifications();
        updateNotificationBadges(); // Update badges for admin
    } else {
        showAlert('Acceso denegado. Solo administradores.');
        showLogin();
    }
}

function showEmployeeDashboard() {
    if (currentUser && currentUser.role === 'employee') {
        document.getElementById('login-section').classList.add('d-none');
        document.getElementById('admin-dashboard-section').classList.add('d-none');
        document.getElementById('employee-dashboard-section').classList.remove('d-none');
        document.getElementById('nav-login').classList.add('d-none');
        document.getElementById('nav-logout').classList.remove('d-none');
        document.getElementById('nav-admin-dashboard').classList.add('d-none');
        document.getElementById('nav-employee-dashboard').classList.remove('d-none');
        renderEmployeeAssignedServices();
        renderEmployeeNotifications();
        updateNotificationBadges(); // Update badges for employee
    } else {
        showAlert('Acceso denegado. Solo empleados.');
        showLogin();
    }
}

function logout() {
    currentUser = null;
    showLogin();
    showAlert('Sesión cerrada.');
}

// --- Login Logic ---
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('login-error');

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        currentUser = user;
        loginError.textContent = '';
        if (currentUser.role === 'admin') {
            showAdminDashboard();
        } else if (currentUser.role === 'employee') {
            showEmployeeDashboard();
        }
    } else {
        loginError.textContent = 'Usuario o contraseña incorrectos.';
    }
});

// --- User Management (Admin) ---

function renderUserList() {
    const userListElement = document.getElementById('user-list');
    userListElement.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.role === 'admin' ? 'Administrador' : 'Técnico'}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editUser('${user.id}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}')">Eliminar</button>
            </td>
        `;
        userListElement.appendChild(row);
    });
}

document.getElementById('user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const userId = document.getElementById('edit-user-id').value;
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;

    if (userId) {
        // Edit existing user
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex] = { id: userId, username, password, role };
        }
    } else {
        // Create new user
        if (users.some(u => u.username === username)) {
            showAlert('El nombre de usuario ya existe.');
            return;
        }
        users.push({ id: generateId(), username, password, role });
    }
    saveUsers();
    renderUserList();
    populateTechnicianDropdowns();
    populateAssignTechnicianDropdown();
    const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
    modal.hide();
    document.getElementById('user-form').reset();
    document.getElementById('edit-user-id').value = '';
});

function editUser(id) {
    const user = users.find(u => u.id === id);
    if (user) {
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-password').value = user.password;
        document.getElementById('user-role').value = user.role;
        const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
        modal.show();
        document.getElementById('createUserModalLabel').textContent = 'Editar Usuario';
    }
}

function deleteUser(id) {
    showConfirm('¿Estás seguro de que quieres eliminar este usuario?', (result) => {
        if (result) {
            users = users.filter(u => u.id !== id);
            saveUsers();
            renderUserList();
            populateTechnicianDropdowns();
            populateAssignTechnicianDropdown();
            // Desasignar servicios si el técnico eliminado tenía alguno asignado
            services.forEach(service => {
                if (service.technicianId === id) {
                    service.technicianId = null;
                    service.status = 'Pendiente'; // Reset status
                }
            });
            saveServices();
            renderAdminServicesList();
            renderAssignedServicesList();
            renderEmployeeAssignedServices(); // Refresh for other employees
            showAlert('Usuario eliminado exitosamente.');
        }
    });
}

// --- Service Registration and Management (Admin) ---

function populateTechnicianDropdowns() {
    const technicianSelect = document.getElementById('service-technician');
    technicianSelect.innerHTML = '<option value="">Selecciona un técnico...</option>';

    const technicians = users.filter(user => user.role === 'employee');

    technicians.forEach(tech => {
        const option = document.createElement('option');
        option.value = tech.id;
        option.textContent = tech.username;
        technicianSelect.appendChild(option);
    });
}


function renderAdminServicesList(filteredServices = services) {
    const servicesListElement = document.getElementById('services-list-admin');
    servicesListElement.innerHTML = '';
    filteredServices.forEach(service => {
        const row = document.createElement('tr');
        const canEdit = !['Finalizado', 'Cancelado'].includes(service.status);
        const editButton = canEdit ?
            `<button class="btn btn-warning btn-sm" onclick="editService('${service.id}')">Editar</button>` :
            `<button class="btn btn-warning btn-sm" disabled title="No se puede editar servicio finalizado/cancelado">Editar</button>`;
        const deleteButton = canEdit ?
            `<button class="btn btn-danger btn-sm" onclick="deleteService('${service.id}')">Eliminar</button>` :
            `<button class="btn btn-danger btn-sm" disabled title="No se puede eliminar servicio finalizado/cancelado">Eliminar</button>`;

        row.innerHTML = `
            <td>${service.date}</td>
            <td>${service.clientName}</td>
            <td>${service.safeType}</td>
            <td>${service.location}</td>
            <td>${getTechnicianNameById(service.technicianId)}</td>
            <td>${service.status}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')">Ver</button>
                ${editButton}
                ${deleteButton}
            </td>
        `;
        servicesListElement.appendChild(row);
    });
}

function filterClientServices() {
    const searchTerm = document.getElementById('search-client-services').value.toLowerCase();
    const filtered = services.filter(service =>
        service.clientName.toLowerCase().includes(searchTerm)
    );
    renderAdminServicesList(filtered);
}

document.getElementById('service-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const serviceId = document.getElementById('edit-service-id').value;
    const date = document.getElementById('service-date').value;
    const safeType = document.getElementById('service-safe-type').value;
    const location = document.getElementById('service-location').value;
    const clientName = document.getElementById('service-client-name').value;
    const clientPhone = document.getElementById('service-client-phone').value;
    const status = document.getElementById('service-status').value;

    let photoData = '';
    const photoInput = document.getElementById('service-photo');

    // Handle required fields for Finalizado status for technician
    if (status === 'Finalizado' && currentUser.role === 'employee') {
        let missingFields = [];
        if (!photoInput.files.length && !document.getElementById('service-photo-preview').src) missingFields.push('foto de evidencia');
        if (signaturePadClient && signaturePadClient.isEmpty()) missingFields.push('firma del cliente');
        if (signaturePadTechnician && signaturePadTechnician.isEmpty()) missingFields.push('firma del técnico');

        if (missingFields.length > 0) {
            showAlert(`Para finalizar el servicio, por favor proporcione: ${missingFields.join(', ')}.`);
            return; // Prevent form submission
        }
    }

    if (photoInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(event) {
            photoData = event.target.result;
            saveServiceData(serviceId, date, safeType, location, clientName, clientPhone, status, photoData);
        };
        reader.readAsDataURL(photoInput.files[0]);
    } else {
        // If no new photo, keep existing one if editing
        if (serviceId) {
            const existingService = services.find(s => s.id === serviceId);
            if (existingService) {
                photoData = existingService.photo;
            }
        }
        saveServiceData(serviceId, date, safeType, location, clientName, clientPhone, status, photoData);
    }
});

function saveServiceData(serviceId, date, safeType, location, clientName, clientPhone, status, photoData) {
    let clientSignatureData = '';
    let technicianSignatureData = '';

    const clientSignatureSectionVisible = !document.getElementById('client-signature-section').classList.contains('d-none');
    const technicianSignatureSectionVisible = !document.getElementById('technician-signature-section').classList.contains('d-none');

    if (clientSignatureSectionVisible) {
        if (signaturePadClient && !signaturePadClient.isEmpty()) {
            clientSignatureData = signaturePadClient.toDataURL();
        } else if (status === 'Finalizado' && currentUser.role === 'employee') { // Require signature only if finalising as employee
            showAlert('Por favor, el cliente debe firmar.');
            return;
        }
    }
    if (technicianSignatureSectionVisible) {
        if (signaturePadTechnician && !signaturePadTechnician.isEmpty()) {
            technicianSignatureData = signaturePadTechnician.toDataURL();
        } else if (status === 'Finalizado' && currentUser.role === 'employee') { // Require signature only if finalising as employee
            showAlert('Por favor, el técnico debe firmar.');
            return;
        }
    }


    let currentTechnicianId = null;
    let cancellationReason = null;
    let finalizationOrCancellationTime = null;
    let finalizationOrCancellationLocation = null;
    let startTime = null;
    let startLocation = null;

    if (serviceId) {
        const existingService = services.find(s => s.id === serviceId);
        if (existingService) {
            currentTechnicianId = existingService.technicianId;
            cancellationReason = existingService.cancellationReason || null;
            finalizationOrCancellationTime = existingService.finalizationOrCancellationTime || null;
            finalizationOrCancellationLocation = existingService.finalizationOrCancellationLocation || null;
            startTime = existingService.startTime || null;
            startLocation = existingService.startLocation || null;


            if (!document.getElementById('service-technician-field').classList.contains('d-none')) {
                currentTechnicianId = document.getElementById('service-technician').value;
            }
        }
    }

    // Capture cancellation reason if status is 'Cancelado'
    // This logic is now primarily handled by handleEmployeeServiceStatusChange for the prompt
    // but the final assignment happens here.
    if (status === 'Cancelado' && currentUser.role === 'admin') { // Admin can change to cancelled and must provide reason
        if (cancellationReason === null) {
            showConfirm('Para cancelar el servicio, por favor ingrese el motivo de la cancelación:', (inputReason) => {
                if (inputReason === null || inputReason.trim() === '') {
                    showAlert('El motivo de cancelación es obligatorio.');
                    return;
                }
                cancellationReason = inputReason;
                // Since confirm is async, re-call the main save function with the reason
                saveServiceData(serviceId, date, safeType, location, clientName, clientPhone, status, photoData);
            });
            return; // Exit to wait for confirm modal input
        }
    } else if (status !== 'Cancelado') {
        cancellationReason = null; // Clear reason if not cancelled
    }


    // Record finalization/cancellation time and location
    if ((status === 'Finalizado' || status === 'Cancelado') && currentUser.role === 'employee') {
        navigator.geolocation.getCurrentPosition((position) => {
            finalizationOrCancellationTime = new Date().toISOString();
            finalizationOrCancellationLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            // Proceed to save once location is obtained
            finalizeServiceSave();
        }, (error) => {
            showAlert('No se pudo obtener la ubicación para la finalización/cancelación. Por favor, asegúrate de que la ubicación esté activada y permitida.');
            console.error('Error al obtener ubicación:', error);
            return; // Stop if location cannot be obtained
        });
    } else {
        finalizeServiceSave(); // Save directly if not finalization/cancellation by employee
    }

    function finalizeServiceSave() {
        const newService = {
            id: serviceId || generateId(),
            date,
            safeType,
            location,
            technicianId: currentTechnicianId,
            photo: photoData,
            clientName,
            clientPhone,
            clientSignature: clientSignatureData,
            technicianSignature: technicianSignatureData,
            status,
            cancellationReason: cancellationReason,
            startTime: startTime,
            startLocation: startLocation,
            finalizationOrCancellationTime: finalizationOrCancellationTime, // New field
            finalizationOrCancellationLocation: finalizationOrCancellationLocation // New field
        };

        if (serviceId) {
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                if (['Finalizado', 'Cancelado'].includes(services[serviceIndex].status) && currentUser.role === 'admin' && serviceId) {
                    // Allow admin to edit finalized/cancelled service IF it's only status or technician, not all fields
                    // For full restriction:
                    // showAlert('No se puede editar un servicio finalizado o cancelado.');
                    // return;

                    // If you want to prevent editing ALL fields, but allow technician assignment:
                    // If the original status was fixed, only allow technicianId change if it's the admin,
                    // and then only if the service is not currently finalizado/cancelado AND the technician field is visible.
                    if (['Finalizado', 'Cancelado'].includes(services[serviceIndex].status) && currentUser.role === 'admin' && services[serviceIndex].status === newService.status && services[serviceIndex].technicianId === newService.technicianId) {
                        // If admin is trying to save a fixed service without changing status or technician, it's blocked.
                        // This case is for when they open a fixed service and just click save without changing anything crucial.
                         showAlert('No se puede editar un servicio finalizado o cancelado.');
                         return;
                    }

                    // Otherwise, allow the update
                }
                services[serviceIndex] = newService;
            }
        } else {
            services.push(newService);
        }
        saveServices();
        renderAdminServicesList();
        populateAssignServiceDropdown();
        const modal = bootstrap.Modal.getInstance(document.getElementById('registerServiceModal'));
        modal.hide();
        document.getElementById('service-form').reset();
        clearSignaturePad('client');
        clearSignaturePad('technician');
        document.getElementById('service-photo-preview').classList.add('d-none');
        document.getElementById('edit-service-id').value = '';
        document.getElementById('service-photo').value = '';


        if (currentUser.role === 'employee') {
            renderEmployeeAssignedServices();
        }
        showAlert('Servicio guardado exitosamente.');
    }
}

function editService(id) {
    const service = services.find(s => s.id === id);
    if (service) {
        if (['Finalizado', 'Cancelado'].includes(service.status) && currentUser.role === 'admin') {
            // Allow admin to open, but most fields will be uneditable or should be visually distinct
            // For now, blocking full edit if status is fixed
            // showAlert('No se puede editar un servicio finalizado o cancelado directamente. Puedes ver los detalles.');
            // viewServiceDetails(id); // Show details instead
            // return;
        }

        document.getElementById('edit-service-id').value = service.id;
        document.getElementById('service-date').value = service.date;
        document.getElementById('service-safe-type').value = service.safeType;
        document.getElementById('service-location').value = service.location;

        const technicianField = document.getElementById('service-technician-field');
        if (service.technicianId || currentUser.role === 'admin') { // Admin can always see and assign technician
            technicianField.classList.remove('d-none');
            document.getElementById('service-technician').value = service.technicianId || '';
        } else {
            technicianField.classList.add('d-none');
            document.getElementById('service-technician').value = '';
        }

        document.getElementById('service-client-name').value = service.clientName;
        document.getElementById('service-client-phone').value = service.clientPhone;
        document.getElementById('service-status').value = service.status;

        togglePhotoAndSignatureSections(service.status, currentUser.role === 'employee');


        if (service.photo) {
            document.getElementById('service-photo-preview').src = service.photo;
            document.getElementById('service-photo-preview').classList.remove('d-none');
        } else {
            document.getElementById('service-photo-preview').classList.add('d-none');
        }

        const signatureCanvasClient = document.getElementById('signature-pad-client');
        if (service.clientSignature && signaturePadClient) {
            const img = new Image();
            img.onload = function() {
                if (signaturePadClient) {
                    signaturePadClient.fromDataURL(service.clientSignature, {
                        width: signatureCanvasClient.width,
                        height: signatureCanvasClient.height
                    });
                }
            };
            img.src = service.clientSignature;
        } else {
            clearSignaturePad('client');
        }

        const signatureCanvasTechnician = document.getElementById('signature-pad-technician');
        if (service.technicianSignature && signaturePadTechnician) {
            const img = new Image();
            img.onload = function() {
                if (signaturePadTechnician) {
                    signaturePadTechnician.fromDataURL(service.technicianSignature, {
                        width: signatureCanvasTechnician.width,
                        height: signatureCanvasTechnician.height
                    });
                }
            };
            img.src = service.technicianSignature;
        } else {
            clearSignaturePad('technician');
        }

        const modal = new bootstrap.Modal(document.getElementById('registerServiceModal'));
        modal.show();
        document.getElementById('registerServiceModalLabel').textContent = 'Editar Servicio';
    }
}

function togglePhotoAndSignatureSections(status, forTechnicianView = false) {
    const photoSection = document.getElementById('photo-evidence-section');
    const clientSignatureSection = document.getElementById('client-signature-section');
    const technicianSignatureSection = document.getElementById('technician-signature-section');
    const technicianField = document.getElementById('service-technician-field');

    // Always hide by default
    photoSection.classList.add('d-none');
    clientSignatureSection.classList.add('d-none');
    technicianSignatureSection.classList.add('d-none');
    // technicianField.classList.add('d-none'); // Don't hide for admin when opening existing service

    // Clear signatures/photo input when toggling sections for new state/edit
    if (signaturePadClient) signaturePadClient.clear();
    if (signaturePadTechnician) signaturePadTechnician.clear();
    document.getElementById('service-photo').value = '';
    document.getElementById('service-photo-preview').classList.add('d-none');


    if (forTechnicianView) { // Logic for Employee Dashboard
        if (status === 'Finalizado') {
            photoSection.classList.remove('d-none');
            clientSignatureSection.classList.remove('d-none');
            technicianSignatureSection.classList.remove('d-none');
        }
        technicianField.classList.add('d-none'); // Technician cannot change assigned technician
    } else { // Logic for Admin Dashboard
        // Admin can register new service (no fields initially shown), or edit existing.
        // For admin, if they are editing a service that is 'Finalizado' or 'Cancelado',
        // show relevant sections and technician field.
        if (status === 'Finalizado' || status === 'Cancelado') {
            photoSection.classList.remove('d-none');
            clientSignatureSection.classList.remove('d-none');
            technicianSignatureSection.classList.remove('d-none');
            // The technician field should always be visible for admin if there's a technician assigned
            // or if it's a new service being created (so they can assign)
            technicianField.classList.remove('d-none');
        }
         // Also show technician field for admin when creating/editing other states
         const serviceId = document.getElementById('edit-service-id').value;
         if (!serviceId || (serviceId && services.find(s => s.id === serviceId))) {
             technicianField.classList.remove('d-none');
         }
    }
}


document.getElementById('service-status').addEventListener('change', (event) => {
    togglePhotoAndSignatureSections(event.target.value, currentUser.role === 'employee');
});


function deleteService(id) {
    showConfirm('¿Estás seguro de que quieres eliminar este servicio?', (result) => {
        if (result) {
            const serviceToDelete = services.find(s => s.id === id);

            if (serviceToDelete && ['Finalizado', 'Cancelado'].includes(serviceToDelete.status)) {
                showAlert('No se puede eliminar un servicio finalizado o cancelado.');
                return;
            }

            // Send notification to technician if service was assigned
            if (serviceToDelete && serviceToDelete.technicianId) {
                const technicianName = getTechnicianNameById(serviceToDelete.technicianId);
                const message = `El servicio ID: ${serviceToDelete.id} (Cliente: ${serviceToDelete.clientName}, Tipo: ${serviceToDelete.safeType}) ha sido ELIMINADO por el administrador. Ya no está asignado a ti.`;
                sendNotification(serviceToDelete.technicianId, message);
            }

            services = services.filter(s => s.id !== id);
            saveServices();
            renderAdminServicesList();
            populateAssignServiceDropdown();
            renderAssignedServicesList();
            renderEmployeeAssignedServices();
            showAlert('Servicio eliminado exitosamente.'); // Confirmation for admin
        }
    });
}

function viewServiceDetails(id) {
    const service = services.find(s => s.id === id);
    if (service) {
        const detailsHtml = `
            <p><strong>ID Servicio:</strong> ${service.id}</p>
            <p><strong>Fecha:</strong> ${service.date}</p>
            <p><strong>Tipo de Caja Fuerte:</strong> ${service.safeType}</p>
            <p><strong>Ubicación:</strong> ${service.location}</p>
            <p><strong>Técnico Encargado:</strong> ${getTechnicianNameById(service.technicianId)}</p>
            <p><strong>Nombre del Cliente:</strong> ${service.clientName}</p>
            <p><strong>Teléfono del Cliente:</strong> ${service.clientPhone}</p>
            <p><strong>Estado:</strong> ${service.status}</p>
            ${service.cancellationReason ? `<p><strong>Motivo de Cancelación:</strong> ${service.cancellationReason}</p>` : ''}
            ${service.startTime ? `<p><strong>Hora de Inicio:</strong> ${new Date(service.startTime).toLocaleString()}</p>` : ''}
            ${service.startLocation ? `<p><strong>Ubicación de Inicio:</strong> Lat: ${service.startLocation.latitude}, Lon: ${service.startLocation.longitude}</p>` : ''}
            ${service.finalizationOrCancellationTime ? `<p><strong>Fecha/Hora de Finalización/Cancelación:</strong> ${new Date(service.finalizationOrCancellationTime).toLocaleString()}</p>` : ''}
            ${service.finalizationOrCancellationLocation ? `<p><strong>Ubicación de Finalización/Cancelación:</strong> Lat: ${service.finalizationOrCancellationLocation.latitude}, Lon: ${service.finalizationOrCancellationLocation.longitude}</p>` : ''}
            ${service.photo ? `<p><strong>Evidencia Fotográfica:</strong><br><img src="${service.photo}" class="img-fluid" alt="Evidencia"></p>` : ''}
            ${service.clientSignature ? `<p><strong>Firma del Cliente:</strong><br><img src="${service.clientSignature}" class="img-fluid" alt="Firma del Cliente"></p>` : ''}
            ${service.technicianSignature ? `<p><strong>Firma del Técnico:</strong><br><img src="${service.technicianSignature}" class="img-fluid" alt="Firma del Técnico"></p>` : ''}

        `;
        document.getElementById('view-service-details').innerHTML = detailsHtml;
        const modal = new bootstrap.Modal(document.getElementById('viewServiceModal'));
        modal.show();
    }
}

// Helper to get technician name
function getTechnicianNameById(id) {
    const tech = users.find(u => u.id === id);
    return tech ? tech.username : 'No Asignado';
}

// --- Assign Tasks/Services (Admin) ---

function populateAssignServiceDropdown() {
    const dropdown = document.getElementById('assign-service-id');
    dropdown.innerHTML = '<option value="">Seleccionar un servicio...</option>';
    services.filter(s => !s.technicianId && !['Finalizado', 'Cancelado'].includes(s.status)).forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `ID: ${service.id} - Cliente: ${service.clientName} - Ubicación: ${service.location}`;
        dropdown.appendChild(option);
    });
}

function populateAssignTechnicianDropdown() {
    const dropdown = document.getElementById('assign-technician');
    dropdown.innerHTML = '<option value="">Seleccionar un técnico...</option>';
    users.filter(u => u.role === 'employee').forEach(technician => {
        const option = document.createElement('option');
        option.value = technician.id;
        option.textContent = technician.username;
        dropdown.appendChild(option);
    });
}

function assignServiceToTechnician() {
    const serviceId = document.getElementById('assign-service-id').value;
    const technicianId = document.getElementById('assign-technician').value;
    const assignMessage = document.getElementById('assign-message');

    if (!serviceId || !technicianId) {
        assignMessage.textContent = 'Por favor, selecciona un servicio y un técnico.';
        assignMessage.className = 'text-danger mt-3';
        return;
    }

    const serviceIndex = services.findIndex(s => s.id === serviceId);
    if (serviceIndex !== -1) {
        if (['Finalizado', 'Cancelado'].includes(services[serviceIndex].status)) {
            assignMessage.textContent = 'No se puede re-asignar un servicio finalizado o cancelado.';
            assignMessage.className = 'text-danger mt-3';
            return;
        }

        services[serviceIndex].technicianId = technicianId;
        services[serviceIndex].status = 'Pendiente';
        saveServices();
        assignMessage.textContent = 'Servicio asignado exitosamente.';
        assignMessage.className = 'text-success mt-3';
        sendNotification(technicianId, `¡Nuevo servicio asignado! ID: ${serviceId}. Cliente: ${services[serviceIndex].clientName}. Ubicación: ${services[serviceIndex].location}.`);
        renderAdminServicesList();
        renderAssignedServicesList();
        populateAssignServiceDropdown();
        document.getElementById('assign-service-id').value = '';
        document.getElementById('assign-technician').value = '';
        renderEmployeeAssignedServices();

        // Hide message after 3 seconds
        setTimeout(() => {
            assignMessage.textContent = '';
            assignMessage.className = '';
        }, 3000);

    } else {
        assignMessage.textContent = 'Error: Servicio no encontrado.';
        assignMessage.className = 'text-danger mt-3';
    }
}

function renderAssignedServicesList() {
    const assignedListElement = document.getElementById('assigned-services-list');
    assignedListElement.innerHTML = '';
    services.filter(s => s.technicianId).forEach(service => {
        const row = document.createElement('tr');
        const canUnassign = !['Finalizado', 'Cancelado'].includes(service.status);
        const unassignButton = canUnassign ?
            `<button class="btn btn-secondary btn-sm" onclick="unassignService('${service.id}')">Desasignar</button>` :
            `<button class="btn btn-secondary btn-sm" disabled title="No se puede desasignar servicio finalizado/cancelado">Desasignar</button>`;

        row.innerHTML = `
            <td>${service.id}</td>
            <td>${service.clientName}</td>
            <td>${getTechnicianNameById(service.technicianId)}</td>
            <td>${service.status}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')">Ver</button>
                ${unassignButton}
            </td>
        `;
        assignedListElement.appendChild(row);
    });
}

function unassignService(serviceId) {
    showConfirm('¿Estás seguro de que quieres desasignar este servicio?', (result) => {
        if (result) {
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                const service = services[serviceIndex];
                if (['Finalizado', 'Cancelado'].includes(service.status)) {
                    showAlert('No se puede desasignar un servicio finalizado o cancelado.');
                    return;
                }
                const oldTechnicianId = service.technicianId; // Capture old technician ID
                service.technicianId = null;
                service.status = 'Pendiente';
                saveServices();
                renderAdminServicesList();
                renderAssignedServicesList();
                populateAssignServiceDropdown();
                sendNotification('admin', `El servicio ID: ${serviceId} ha sido desasignado por el administrador.`);
                // Notify the technician that the service was unassigned
                if (oldTechnicianId) {
                    sendNotification(oldTechnicianId, `El servicio ID: ${serviceId} (Cliente: ${service.clientName}, Tipo: ${service.safeType}) ha sido DESASIGNADO por el administrador. Ya no está asignado a ti.`);
                }
                renderEmployeeAssignedServices();
                showAlert('Servicio desasignado exitosamente.');
            }
        }
    });
}


// --- Report Novelty/Problems ---

document.getElementById('novelty-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const serviceId = document.getElementById('novelty-service-id').value;
    const description = document.getElementById('novelty-description').value;

    const newReport = {
        id: generateId(),
        date: new Date().toISOString().split('T')[0],
        serviceId: serviceId || 'N/A',
        reporterId: currentUser.id,
        reporterName: currentUser ? currentUser.username : 'Desconocido',
        description: description,
        replies: [],
        readForAdmin: false // Mark as unread for admin when a new report is created
    };
    reports.push(newReport);
    saveReports();
    renderReportsList();
    sendNotification('admin', `¡Nueva novedad reportada! ID Servicio: ${newReport.serviceId} por ${newReport.reporterName}.`);
    updateNotificationBadges();

    const modal = bootstrap.Modal.getInstance(document.getElementById('reportNoveltyModal'));
    modal.hide();
    document.getElementById('novelty-form').reset();
    showAlert('Novedad reportada con éxito.');
});

function renderReportsList() {
    const reportsListElement = document.getElementById('reports-list');
    reportsListElement.innerHTML = '';
    const sortedReports = reports.sort((a,b) => new Date(b.date) - new Date(a.date));

    if (sortedReports.length === 0) {
        reportsListElement.innerHTML = '<p>No hay reportes de novedades.</p>';
        return;
    }
    sortedReports.forEach(report => {
        const reportDiv = document.createElement('div');
        // Add a class to indicate unread for admin, for visual cue if desired in the list itself
        reportDiv.className = `alert alert-warning ${!report.readForAdmin ? 'border-primary' : ''}`; // Example visual cue

        let repliesHtml = '';
        if (report.replies && report.replies.length > 0) {
            repliesHtml = '<h6 class="mt-2">Respuestas:</h6><ul class="list-group">';
            report.replies.forEach(reply => {
                repliesHtml += `<li class="list-group-item list-group-item-light"><strong>Admin (${new Date(reply.timestamp).toLocaleString()}):</strong> ${reply.message}</li>`;
            });
            repliesHtml += '</ul>';
        }

        reportDiv.innerHTML = `
            <strong>ID Reporte:</strong> ${report.id}<br>
            <strong>Fecha:</strong> ${report.date}<br>
            <strong>ID Servicio:</strong> ${report.serviceId}<br>
            <strong>Reportado por:</strong> ${report.reporterName}<br>
            <strong>Descripción:</strong> ${report.description}
            ${repliesHtml}
            <button class="btn btn-sm btn-primary mt-2" onclick="openReplyReportModal('${report.id}')">Responder</button>
        `;
        reportsListElement.appendChild(reportDiv);
    });
    updateNotificationBadges();
}

function openReplyReportModal(reportId) {
    document.getElementById('reply-report-id').value = reportId;
    const modal = new bootstrap.Modal(document.getElementById('replyReportModal'));
    modal.show();
}

document.getElementById('reply-report-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const reportId = document.getElementById('reply-report-id').value;
    const replyMessage = document.getElementById('reply-report-message').value;

    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex !== -1) {
        const report = reports[reportIndex];
        if (!report.replies) {
            report.replies = [];
        }
        const newReply = {
            message: replyMessage,
            timestamp: new Date().toISOString(),
            adminId: currentUser.id,
            adminName: currentUser.username,
            readForTechnician: false
        };
        report.replies.push(newReply);
        // Mark the report as "read" for the admin once they reply
        report.readForAdmin = true;
        saveReports();
        renderReportsList();
        sendNotification(report.reporterId, `¡El administrador ha respondido a tu reporte ID ${report.id}: "${replyMessage}"`);
        updateNotificationBadges(); // Crucial for updating the badge

        const modal = bootstrap.Modal.getInstance(document.getElementById('replyReportModal'));
        modal.hide();
        document.getElementById('reply-report-form').reset();
        showAlert('Respuesta enviada.');
    } else {
        showAlert('Error: Reporte no encontrado.');
    }
});


// --- Employee Dashboard ---

function renderEmployeeAssignedServices() {
    const employeeServicesList = document.getElementById('employee-assigned-services-list');
    employeeServicesList.innerHTML = '';
    const assignedToMe = services.filter(s => s.technicianId === currentUser.id);

    if (assignedToMe.length === 0) {
        employeeServicesList.innerHTML = '<tr><td colspan="6">No tienes servicios asignados.</td></tr>';
        return;
    }

    assignedToMe.forEach(service => {
        const row = document.createElement('tr');
        const isStatusFixed = ['Finalizado', 'Cancelado'].includes(service.status);
        const dropdownDisabled = isStatusFixed ? 'disabled' : '';
        const dropdownTitle = isStatusFixed ? 'No se puede cambiar el estado de un servicio finalizado/cancelado' : '';

        const showStartButton = service.status === 'Pendiente';

        row.innerHTML = `
            <td>${service.id}</td>
            <td>${service.clientName}</td>
            <td>${service.safeType}</td>
            <td>${service.location}</td>
            <td>${service.status}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')">Ver</button>
                <div class="dropdown d-inline-block ms-2">
                    <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="dropdownMenuButton${service.id}" data-bs-toggle="dropdown" aria-expanded="false" ${dropdownDisabled} title="${dropdownTitle}">
                        Cambiar Estado
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton${service.id}">
                        <li><a class="dropdown-item ${isStatusFixed || service.status === 'Pendiente' ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed} && '${service.status}' !== 'Pendiente') handleEmployeeServiceStatusChange('${service.id}', 'Pendiente')">Pendiente</a></li>
                        <li><a class="dropdown-item ${isStatusFixed || service.status === 'En proceso' ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed} && '${service.status}' !== 'En proceso') handleEmployeeServiceStatusChange('${service.id}', 'En proceso')">En proceso</a></li>
                        <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Finalizado')">Finalizado</a></li>
                        <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Cancelado')">Cancelado</a></li>
                    </ul>
                </div>
                ${showStartButton ? `<button class="btn btn-success btn-sm ms-2" onclick="startService('${service.id}')">Iniciar Servicio</button>` : ''}
                <button class="btn btn-danger btn-sm ms-2" data-bs-toggle="modal" data-bs-target="#reportNoveltyModal" onclick="prefillNoveltyServiceId('${service.id}')">Reportar Novedad</button>
            </td>
        `;
        employeeServicesList.appendChild(row);
    });
    updateNotificationBadges();
}

function handleEmployeeServiceStatusChange(id, newStatus) {
    const service = services.find(s => s.id === id);
    if (!service) return;

    if (['Finalizado', 'Cancelado'].includes(service.status)) {
        showAlert('No se puede cambiar el estado de un servicio finalizado o cancelado.');
        return;
    }

    if (newStatus === 'Finalizado') {
        openServiceFinalizationModal(id);
    } else if (newStatus === 'Cancelado') {
        // Show the modal for cancellation reason
        const cancelReasonModal = new bootstrap.Modal(document.getElementById('cancelReasonModal'));
        document.getElementById('cancel-reason-input').value = ''; // Clear previous input
        cancelReasonModal.show();

        // Store service ID temporarily to use in modal's confirm button
        document.getElementById('confirmCancelReasonBtn').dataset.serviceId = id;

        // Remove previous event listener to prevent duplicates
        const confirmCancelBtn = document.getElementById('confirmCancelReasonBtn');
        confirmCancelBtn.onclick = null; // Important to prevent multiple listeners

        confirmCancelBtn.onclick = () => {
            const reason = document.getElementById('cancel-reason-input').value;
            if (reason === null || reason.trim() === '') {
                showAlert('El motivo de cancelación es obligatorio.');
                return;
            }
            changeServiceStatus(id, newStatus, reason);
            cancelReasonModal.hide();
        };
    } else {
        changeServiceStatus(id, newStatus);
    }
}

function openServiceFinalizationModal(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (service) {
        document.getElementById('edit-service-id').value = service.id;
        document.getElementById('registerServiceModalLabel').textContent = `Finalizar Servicio: ${service.id}`;

        // Llenar los campos del formulario
        document.getElementById('service-date').value = service.date;
        document.getElementById('service-safe-type').value = service.safeType;
        document.getElementById('service-location').value = service.location;
        document.getElementById('service-client-name').value = service.clientName;
        document.getElementById('service-client-phone').value = service.clientPhone;
        document.getElementById('service-status').value = 'Finalizado'; // Establece el estado a Finalizado

        // Ocultar campo de técnico para el técnico
        document.getElementById('service-technician-field').classList.add('d-none');

        // --- ESTA ES LA CLAVE ---
        // Aseguramos que los campos se muestren y se inicialicen
        document.getElementById('photo-evidence-section').classList.remove('d-none');
        document.getElementById('client-signature-section').classList.remove('d-none');
        document.getElementById('technician-signature-section').classList.remove('d-none');

        // Pre-cargar foto si existe
        if (service.photo) {
            document.getElementById('service-photo-preview').src = service.photo;
            document.getElementById('service-photo-preview').classList.remove('d-none');
        } else {
            document.getElementById('service-photo-preview').classList.add('d-none');
            document.getElementById('service-photo').value = ''; // Limpiar input de archivo
        }

        // Inicializar y cargar firmas
        initializeSignaturePads(); // Asegura que los objetos signaturePad existan
        if (service.clientSignature) {
            const imgClient = new Image();
            imgClient.onload = function() {
                if (signaturePadClient) signaturePadClient.fromDataURL(service.clientSignature);
            };
            imgClient.src = service.clientSignature;
        } else {
            clearSignaturePad('client');
        }

        if (service.technicianSignature) {
            const imgTechnician = new Image();
            imgTechnician.onload = function() {
                if (signaturePadTechnician) signaturePadTechnician.fromDataURL(service.technicianSignature);
            };
            imgTechnician.src = service.technicianSignature;
        } else {
            clearSignaturePad('technician');
        }

        // Deshabilitar campos que el técnico no debe editar al finalizar
        document.getElementById('service-date').disabled = true;
        document.getElementById('service-safe-type').disabled = true;
        document.getElementById('service-location').disabled = true;
        document.getElementById('service-client-name').disabled = true;
        document.getElementById('service-client-phone').disabled = true;
        document.getElementById('service-status').disabled = true; // El estado ya está en 'Finalizado'

        const modal = new bootstrap.Modal(document.getElementById('registerServiceModal'));
        modal.show();
    }
}


function changeServiceStatus(id, newStatus, cancellationReason = null) {
    const serviceIndex = services.findIndex(s => s.id === id);
    if (serviceIndex !== -1) {
        const oldService = services[serviceIndex];
        const oldStatus = oldService.status;

        oldService.status = newStatus;
        oldService.cancellationReason = cancellationReason;

        // Capture finalization/cancellation time and location
        if ((newStatus === 'Finalizado' || newStatus === 'Cancelado') && currentUser.role === 'employee') {
            navigator.geolocation.getCurrentPosition((position) => {
                oldService.finalizationOrCancellationTime = new Date().toISOString();
                oldService.finalizationOrCancellationLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                saveAndNotify();
            }, (error) => {
                showAlert('No se pudo obtener la ubicación para la finalización/cancelación. Por favor, asegúrate de que la ubicación esté activada y permitida.');
                console.error('Error al obtener ubicación:', error);
            });
        } else {
            saveAndNotify();
        }

        function saveAndNotify() {
            saveServices();
            renderEmployeeAssignedServices();
            renderAdminServicesList();
            sendNotification('admin', `El servicio ID: ${id} ha cambiado de estado de "${oldStatus}" a "${newStatus}" por el técnico ${currentUser.username}. ${newStatus === 'Cancelado' ? `Motivo: ${cancellationReason}` : ''}`);
            showAlert(`Estado del servicio ID ${id} cambiado a "${newStatus}".`);
        }
    }
}

function startService(serviceId) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                if (['Finalizado', 'Cancelado', 'En proceso'].includes(services[serviceIndex].status)) {
                    showAlert('Este servicio ya está en proceso, finalizado o cancelado.');
                    return;
                }

                services[serviceIndex].startTime = new Date().toISOString();
                services[serviceIndex].startLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                services[serviceIndex].status = 'En proceso';
                saveServices();
                renderEmployeeAssignedServices();
                renderAdminServicesList();

                const message = `El técnico ${currentUser.username} ha iniciado el servicio ID: ${serviceId} a las ${new Date().toLocaleString()} en la ubicación: Lat ${position.coords.latitude}, Lon ${position.coords.longitude}.`;
                sendNotification('admin', message);
                showAlert('Servicio iniciado y notificación enviada al administrador.');
            }
        }, (error) => {
            showAlert('No se pudo obtener la ubicación. Por favor, asegúrate de que la ubicación esté activada y permitida para este sitio.');
            console.error('Error al obtener la ubicación:', error);
        });
    } else {
        showAlert('Tu navegador no soporta la geolocalización.');
    }
}

function prefillNoveltyServiceId(serviceId) {
    document.getElementById('novelty-service-id').value = serviceId;
}

// --- Notifications ---

function sendNotification(targetRoleOrUserId, message) {
    let targetUsers = [];
    if (targetRoleOrUserId === 'admin') {
        targetUsers = users.filter(u => u.role === 'admin');
    } else if (typeof targetRoleOrUserId === 'string' && targetRoleOrUserId.startsWith('_')) {
        const targetUser = users.find(u => u.id === targetRoleOrUserId);
        if (targetUser) {
            targetUsers.push(targetUser);
        }
    } else {
        console.warn("Invalid notification target:", targetRoleOrUserId);
        return;
    }


    if (targetUsers.length > 0) {
        targetUsers.forEach(user => {
            notifications.push({
                id: generateId(),
                userId: user.id,
                message: message,
                timestamp: new Date().toISOString(),
                read: false
            });
        });
        saveNotifications();
        updateNotificationBadges();
    }
}

function renderAdminNotifications() {
    const notificationsList = document.getElementById('admin-notifications-list');
    notificationsList.innerHTML = '';
    const adminNotifications = notifications.filter(n => {
        const targetUser = users.find(u => u.id === n.userId);
        return targetUser && targetUser.role === 'admin';
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (adminNotifications.length === 0) {
        notificationsList.innerHTML = '<p>No hay notificaciones para administradores.</p>';
        return;
    }

    adminNotifications.forEach(n => {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `alert ${n.read ? 'alert-light' : 'alert-info'} d-flex justify-content-between align-items-center`;
        notificationDiv.innerHTML = `
            <div>
                <strong>${new Date(n.timestamp).toLocaleString()}:</strong> ${n.message}
            </div>
            ${!n.read ? `<button class="btn btn-sm btn-outline-primary" onclick="markNotificationAsRead('${n.id}')">Marcar como leído</button>` : ''}
        `;
        notificationsList.appendChild(notificationDiv);
    });
    updateNotificationBadges();
}

function renderEmployeeNotifications() {
    const notificationsList = document.getElementById('employee-notifications-list');
    notificationsList.innerHTML = '';
    if (!currentUser) return;

    const employeeNotifications = notifications.filter(n => n.userId === currentUser.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const employeeReportsWithReplies = reports.filter(r => r.reporterId === currentUser.id && r.replies.length > 0);

    if (employeeNotifications.length === 0 && employeeReportsWithReplies.length === 0) {
        notificationsList.innerHTML = '<p>No hay notificaciones para ti.</p>';
        return;
    }

    // Display regular notifications
    employeeNotifications.forEach(n => {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `alert ${n.read ? 'alert-light' : 'alert-info'} d-flex justify-content-between align-items-center`;
        notificationDiv.innerHTML = `
            <div>
                <strong>${new Date(n.timestamp).toLocaleString()}:</strong> ${n.message}
            </div>
            ${!n.read ? `<button class="btn btn-sm btn-outline-primary" onclick="markNotificationAsRead('${n.id}')">Marcar como leído</button>` : ''}
        `;
        notificationsList.appendChild(notificationDiv);
    });

    // Display report replies
    employeeReportsWithReplies.forEach(report => {
        report.replies.filter(reply => !reply.readForTechnician).forEach(reply => {
            const replyDiv = document.createElement('div');
            replyDiv.className = `alert alert-success d-flex justify-content-between align-items-center`;
            replyDiv.innerHTML = `
                <div>
                    <strong>Respuesta a Reporte ID ${report.id} (${new Date(reply.timestamp).toLocaleString()}):</strong> ${reply.message}
                </div>
                <button class="btn btn-sm btn-outline-success" onclick="markReportReplyAsRead('${report.id}', '${reply.timestamp}')">Marcar como leído</button>
            `;
            notificationsList.appendChild(replyDiv);
        });
    });

    updateNotificationBadges();
}

function markNotificationAsRead(id) {
    const notificationIndex = notifications.findIndex(n => n.id === id);
    if (notificationIndex !== -1) {
        notifications[notificationIndex].read = true;
        saveNotifications();
        updateNotificationBadges();
        if (currentUser && currentUser.role === 'admin') {
            renderAdminNotifications();
        } else if (currentUser && currentUser.role === 'employee') {
            renderEmployeeNotifications();
        }
    }
}

function markReportReplyAsRead(reportId, replyTimestamp) {
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex !== -1) {
        const replyIndex = reports[reportIndex].replies.findIndex(reply => reply.timestamp === replyTimestamp);
        if (replyIndex !== -1) {
            reports[reportIndex].replies[replyIndex].readForTechnician = true;
            saveReports();
            updateNotificationBadges();
            renderEmployeeNotifications();
        }
    }
}


// --- Notification Badges in Nav ---
function updateNotificationBadges() {
    const adminReportsTab = document.getElementById('admin-reports-tab');
    const adminNotificationsTab = document.getElementById('admin-notifications-tab');
    const employeeNotificationsTab = document.getElementById('employee-notifications-tab');

    if (currentUser && currentUser.role === 'admin') {
        const unreadReportsCount = reports.filter(r => !r.readForAdmin).length;

        const unreadAdminNotificationsCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length;

        if (unreadReportsCount > 0) {
            adminReportsTab.innerHTML = `Reportes/Novedades <span class="badge bg-danger ms-1">${unreadReportsCount}</span>`;
        } else {
            adminReportsTab.innerHTML = `Reportes/Novedades`;
        }

        if (unreadAdminNotificationsCount > 0) {
            adminNotificationsTab.innerHTML = `Notificaciones <span class="badge bg-danger ms-1">${unreadAdminNotificationsCount}</span>`;
        } else {
            adminNotificationsTab.innerHTML = `Notificaciones`;
        }

    } else if (currentUser && currentUser.role === 'employee') {
        const unreadEmployeeNotificationsCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length;
        const unreadReportRepliesCount = reports.filter(r => r.reporterId === currentUser.id && r.replies.some(reply => !reply.readForTechnician)).length;

        const totalUnreadEmployeeItems = unreadEmployeeNotificationsCount + unreadReportRepliesCount;

        if (totalUnreadEmployeeItems > 0) {
            employeeNotificationsTab.innerHTML = `Notificaciones <span class="badge bg-danger ms-1">${totalUnreadEmployeeItems}</span>`;
        } else {
            employeeNotificationsTab.innerHTML = `Notificaciones`;
        }
    }
}

// --- Funciones de Exportación a Excel ---
function exportToExcel(data, filename) {
    if (!data || data.length === 0) {
        showAlert('No hay datos para exportar.');
        return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, filename + '.xlsx');
}

function exportUsersToExcel() {
    // Excluimos la contraseña si no es deseado exportarla
    const usersToExport = users.map(({ password, ...rest }) => rest);
    exportToExcel(usersToExport, 'usuarios');
}

function exportServicesToExcel() {
    // Ajustamos los datos del servicio para hacerlos más legibles en el Excel
    const servicesToExport = services.map(service => {
        const technicianName = getTechnicianNameById(service.technicianId);
        return {
            'ID Servicio': service.id,
            'Fecha': service.date,
            'Tipo de Caja Fuerte': service.safeType,
            'Ubicación': service.location,
            'Técnico Encargado': technicianName,
            'Nombre del Cliente': service.clientName,
            'Teléfono del Cliente': service.clientPhone,
            'Estado': service.status,
            'Motivo de Cancelación': service.cancellationReason || 'N/A',
            'Hora de Inicio': service.startTime ? new Date(service.startTime).toLocaleString() : 'N/A',
            'Ubicación de Inicio (Lat)': service.startLocation ? service.startLocation.latitude : 'N/A',
            'Ubicación de Inicio (Lon)': service.startLocation ? service.startLocation.longitude : 'N/A',
            'Hora de Finalización/Cancelación': service.finalizationOrCancellationTime ? new Date(service.finalizationOrCancellationTime).toLocaleString() : 'N/A',
            'Ubicación de Finalización/Cancelación (Lat)': service.finalizationOrCancellationLocation ? service.finalizationOrCancellationLocation.latitude : 'N/A',
            'Ubicación de Finalización/Cancelación (Lon)': service.finalizationOrCancellationLocation ? service.finalizationOrCancellationLocation.longitude : 'N/A'
        };
    });
    exportToExcel(servicesToExport, 'servicios');
}


// --- Signature Pad Logic ---

function initializeSignaturePads() {
    const canvasClient = document.getElementById('signature-pad-client');
    const canvasTechnician = document.getElementById('signature-pad-technician');

    if (canvasClient && typeof SignaturePad !== 'undefined') {
        if (signaturePadClient) signaturePadClient.off(); // Detach existing event listeners
        signaturePadClient = new SignaturePad(canvasClient, {
            backgroundColor: 'rgb(255, 255, 255)'
        });
        resizeCanvas(canvasClient, signaturePadClient);
    }

    if (canvasTechnician && typeof SignaturePad !== 'undefined') {
        if (signaturePadTechnician) signaturePadTechnician.off(); // Detach existing event listeners
        signaturePadTechnician = new SignaturePad(canvasTechnician, {
            backgroundColor: 'rgb(255, 255, 255)'
        });
        resizeCanvas(canvasTechnician, signaturePadTechnician);
    }
}

function resizeCanvas(canvas, padInstance) {
    if (!canvas || !padInstance) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    padInstance.clear(); // Clear the canvas after resizing to prevent distortions
}

function clearSignaturePad(type) {
    if (type === 'client' && signaturePadClient) {
        signaturePadClient.clear();
    } else if (type === 'technician' && signaturePadTechnician) {
        signaturePadTechnician.clear();
    }
}

// Photo preview for service registration
document.getElementById('service-photo').addEventListener('change', function(event) {
    const preview = document.getElementById('service-photo-preview');
    if (event.target.files && event.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('d-none');
        };
        reader.readAsDataURL(event.target.files[0]);
    } else {
        preview.classList.add('d-none');
        preview.src = ''; // Clear source if no file is selected
    }
});


// Initial setup on page load
document.addEventListener('DOMContentLoaded', () => {
    showLogin();

    const createUserModalElement = document.getElementById('createUserModal');
    if (createUserModalElement) {
        createUserModalElement.addEventListener('hidden.bs.modal', () => {
             // Reset form when modal is closed
            document.getElementById('user-form').reset();
            document.getElementById('edit-user-id').value = '';
            document.getElementById('createUserModalLabel').textContent = 'Crear/Editar Usuario';
        });
    }

    const registerServiceModalElement = document.getElementById('registerServiceModal');
    if (registerServiceModalElement) {
        registerServiceModalElement.addEventListener('shown.bs.modal', () => {
            initializeSignaturePads();
            populateTechnicianDropdowns();

            const serviceId = document.getElementById('edit-service-id').value;
            let currentStatus = 'Pendiente';
            if (serviceId) {
                const service = services.find(s => s.id === serviceId);
                if (service) {
                    currentStatus = service.status;
                }
            }
            // In case this is an admin editing a non-finalized service, still use toggle
            if (currentUser && currentUser.role === 'admin' && currentStatus !== 'Finalizado' && currentStatus !== 'Cancelado') {
                 togglePhotoAndSignatureSections(currentStatus, false);
            }
            // For employee finalization, openServiceFinalizationModal will handle visibility directly
        });

        registerServiceModalElement.addEventListener('hidden.bs.modal', () => {
            // Resetear el formulario completamente
            document.getElementById('service-form').reset();
            document.getElementById('edit-service-id').value = '';
            document.getElementById('registerServiceModalLabel').textContent = 'Registrar Servicio Realizado';

            // Limpiar y ocultar previsualización de foto
            document.getElementById('service-photo-preview').classList.add('d-none');
            document.getElementById('service-photo').value = '';

            // Limpiar y ocultar firmas
            clearSignaturePad('client');
            clearSignaturePad('technician');
            document.getElementById('photo-evidence-section').classList.add('d-none');
            document.getElementById('client-signature-section').classList.add('d-none');
            document.getElementById('technician-signature-section').classList.add('d-none');

            // Ocultar campo de técnico y restablecer el estado
            document.getElementById('service-technician-field').classList.add('d-none');
            document.getElementById('service-status').value = 'Pendiente'; // Restablecer a Pendiente

            // Habilitar campos que se deshabilitaron al finalizar un servicio
            document.getElementById('service-date').disabled = false;
            document.getElementById('service-safe-type').disabled = false;
            document.getElementById('service-location').disabled = false;
            document.getElementById('service-client-name').disabled = false;
            document.getElementById('service-client-phone').disabled = false;
            document.getElementById('service-status').disabled = false;
        });
    }

    // Initialize signature pads even if the modal is not shown yet, for resilience
    // The `resizeCanvas` call in `shown.bs.modal` will handle dimensions correctly when displayed.
    // Ensure signature_pad.umd.min.js is loaded before script.js
    if (typeof SignaturePad !== 'undefined') {
        initializeSignaturePads();
    } else {
        // Fallback or warning if SignaturePad is not loaded
        console.warn('SignaturePad library not loaded. Signature functionality will be limited.');
    }


    window.addEventListener('resize', () => {
        // Debounce or throttle this if performance issues arise on resize
        resizeCanvas(document.getElementById('signature-pad-client'), signaturePadClient);
        resizeCanvas(document.getElementById('signature-pad-technician'), signaturePadTechnician);
    });
});