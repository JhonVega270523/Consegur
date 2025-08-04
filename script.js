// Global variables for managing state and data
let currentUser = null;
let users = JSON.parse(localStorage.getItem('users')) || [];
let services = JSON.parse(localStorage.getItem('services')) || [];
let reports = JSON.parse(localStorage.getItem('reports')) || [];
let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
let currentTheme = localStorage.getItem('theme') || 'light'; // Tema actual
let currentEmployeeServicesFilter = 'todos'; // Filtro actual para servicios del técnico

// Crear usuario administrador por defecto si no hay usuarios
if (users.length === 0) {
    users = [
        {
            id: generateId(),
            username: 'admin',
            password: 'admin',
            role: 'admin'
        }
    ];
    localStorage.setItem('users', JSON.stringify(users));
    console.log('Usuario administrador por defecto creado:', users[0]);
}

// SignaturePad instances
let signaturePadClient = null;
let signaturePadTechnician = null;

// --- Sistema de Paginación ---
const ITEMS_PER_PAGE = 10;

// Función para dividir un array en páginas
function paginateArray(array, page, itemsPerPage = ITEMS_PER_PAGE) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return array.slice(startIndex, endIndex);
}

// Función para calcular el número total de páginas
function getTotalPages(totalItems, itemsPerPage = ITEMS_PER_PAGE) {
    return Math.ceil(totalItems / itemsPerPage);
}

// Función para generar controles de paginación
function generatePaginationControls(currentPage, totalPages, containerId, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'd-flex justify-content-between align-items-center mt-3';
    
    // Información de página
    const pageInfo = document.createElement('div');
    pageInfo.className = 'text-muted';
    pageInfo.innerHTML = `Página ${currentPage} de ${totalPages}`;
    
    // Controles de navegación
    const navContainer = document.createElement('div');
    navContainer.className = 'd-flex gap-2';
    
    // Botón anterior
    const prevButton = document.createElement('button');
    prevButton.className = `btn btn-outline-primary btn-sm ${currentPage === 1 ? 'disabled' : ''}`;
    prevButton.innerHTML = '<i class="bi bi-chevron-left"></i> Anterior';
    prevButton.onclick = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };
    
    // Botones de página
    const pageButtonsContainer = document.createElement('div');
    pageButtonsContainer.className = 'd-flex gap-1';
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'}`;
        pageButton.textContent = i;
        pageButton.onclick = () => onPageChange(i);
        pageButtonsContainer.appendChild(pageButton);
    }
    
    // Botón siguiente
    const nextButton = document.createElement('button');
    nextButton.className = `btn btn-outline-primary btn-sm ${currentPage === totalPages ? 'disabled' : ''}`;
    nextButton.innerHTML = 'Siguiente <i class="bi bi-chevron-right"></i>';
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };
    
    navContainer.appendChild(prevButton);
    navContainer.appendChild(pageButtonsContainer);
    navContainer.appendChild(nextButton);
    
    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(navContainer);
    container.appendChild(paginationContainer);
}

// Función para agregar numeración a las filas de una tabla
function addRowNumbers(tableBody, startNumber = 1) {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        // Insertar celda de numeración al inicio
        const numberCell = document.createElement('td');
        numberCell.className = 'text-center fw-bold';
        numberCell.style.width = '50px';
        numberCell.textContent = startNumber + index;
        row.insertBefore(numberCell, row.firstChild);
    });
}

// Función para agregar encabezado de numeración a una tabla
function addNumberHeader(tableHeader) {
    const headerRow = tableHeader.querySelector('tr');
    if (headerRow) {
        const numberHeader = document.createElement('th');
        numberHeader.className = 'text-center';
        numberHeader.style.width = '50px';
        numberHeader.innerHTML = '<i class="bi bi-hash"></i>';
        headerRow.insertBefore(numberHeader, headerRow.firstChild);
    }
}

// Initialize an admin user if none exists
if (users.length === 0) {
    users.push({ id: generateId(), username: 'admin', password: 'adminpassword', role: 'admin' });
    saveUsers();
}

// Event listener para cerrar el menú hamburguesa cuando se hace clic en enlaces de navegación
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const navbarCollapse = document.getElementById('navbarNav');
            if (navbarCollapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: false});
                bsCollapse.hide();
            }
        });
    });
});

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
    console.log('showAlert llamado con mensaje:', message);
    
    // Limpiar contenido anterior
    document.getElementById('customAlertModalBody').textContent = message;
    
    // Obtener o crear instancia del modal
    let alertModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
    if (!alertModal) {
        console.log('Creando nueva instancia del modal');
        alertModal = new bootstrap.Modal(document.getElementById('customAlertModal'));
    }
    
    console.log('Mostrando modal de alerta');
    // Mostrar el modal
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
    console.log('showLogin() ejecutándose');
    
    // Mostrar login con múltiples métodos para asegurar que se muestre
    const loginSection = document.getElementById('login-section');
    loginSection.classList.remove('d-none');
    loginSection.style.display = 'block';
    loginSection.style.visibility = 'visible';
    loginSection.style.opacity = '1';
    loginSection.style.position = 'relative';
    loginSection.style.top = 'auto';
    loginSection.style.left = 'auto';
    
    // Ocultar dashboards
    const adminSection = document.getElementById('admin-dashboard-section');
    adminSection.classList.add('d-none');
    adminSection.style.display = 'none';
    adminSection.style.visibility = 'hidden';
    adminSection.style.opacity = '0';
    adminSection.style.position = 'absolute';
    adminSection.style.top = '-9999px';
    adminSection.style.left = '-9999px';
    
    const employeeSection = document.getElementById('employee-dashboard-section');
    employeeSection.classList.add('d-none');
    employeeSection.style.display = 'none';
    employeeSection.style.visibility = 'hidden';
    employeeSection.style.opacity = '0';
    employeeSection.style.position = 'absolute';
    employeeSection.style.top = '-9999px';
    employeeSection.style.left = '-9999px';
    
    // Actualizar navegación
    document.getElementById('nav-login').classList.remove('d-none');
    document.getElementById('nav-logout').classList.add('d-none');
    document.getElementById('nav-admin-dashboard').classList.add('d-none');
    document.getElementById('nav-employee-dashboard').classList.add('d-none');
    
    currentUser = null;
    // Clear login fields on showing login
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    updateNotificationBadges(); // Clear badges on logout
    
    console.log('Login mostrado correctamente');
}

function showAdminDashboard() {
    console.log('showAdminDashboard() ejecutándose');
    if (currentUser && currentUser.role === 'admin') {
        console.log('Ocultando login y mostrando admin dashboard');
        
        // Cerrar el menú hamburguesa si está abierto
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse.classList.contains('show')) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: false});
            bsCollapse.hide();
        }
        
        // Ocultar login con múltiples métodos para asegurar que se oculte
        const loginSection = document.getElementById('login-section');
        loginSection.classList.add('d-none');
        loginSection.style.display = 'none';
        loginSection.style.visibility = 'hidden';
        loginSection.style.opacity = '0';
        loginSection.style.position = 'absolute';
        loginSection.style.top = '-9999px';
        loginSection.style.left = '-9999px';
        
        // Mostrar admin dashboard
        const adminSection = document.getElementById('admin-dashboard-section');
        adminSection.classList.remove('d-none');
        adminSection.style.display = 'block';
        adminSection.style.visibility = 'visible';
        adminSection.style.opacity = '1';
        adminSection.style.position = 'relative';
        adminSection.style.top = 'auto';
        adminSection.style.left = 'auto';
        
        // Ocultar employee dashboard
        document.getElementById('employee-dashboard-section').classList.add('d-none');
        
        // Actualizar navegación
        document.getElementById('nav-login').classList.add('d-none');
        document.getElementById('nav-logout').classList.remove('d-none');
        document.getElementById('nav-admin-dashboard').classList.remove('d-none');
        document.getElementById('nav-employee-dashboard').classList.add('d-none');
        
        // Renderizar contenido
        renderUserList(1);
        renderAdminServicesList(services, 1);
        populateAssignServiceDropdown();
        populateAssignTechnicianDropdown();
        populateTechnicianDropdowns();
        renderAssignedServicesList(1);
        renderReportsList(1);
        renderAdminNotifications(1);
        updateNotificationBadges(); // Update badges for admin
        
        // Establecer fechas por defecto (último mes)
        setDefaultDateFilters();
        
        console.log('Admin dashboard mostrado correctamente');
    } else {
        showAlert('Acceso denegado. Solo administradores.');
        showLogin();
    }
}

function setDefaultDateFilters() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('filter-date-from').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('filter-date-to').value = today.toISOString().split('T')[0];
    
    // Aplicar filtros por defecto
    filterServices();
}

function showEmployeeDashboard() {
    console.log('showEmployeeDashboard() ejecutándose');
    if (currentUser && currentUser.role === 'employee') {
        console.log('Ocultando login y mostrando employee dashboard');
        
        // Cerrar el menú hamburguesa si está abierto
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse.classList.contains('show')) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: false});
            bsCollapse.hide();
        }
        
        // Ocultar login con múltiples métodos para asegurar que se oculte
        const loginSection = document.getElementById('login-section');
        loginSection.classList.add('d-none');
        loginSection.style.display = 'none';
        loginSection.style.visibility = 'hidden';
        loginSection.style.opacity = '0';
        loginSection.style.position = 'absolute';
        loginSection.style.top = '-9999px';
        loginSection.style.left = '-9999px';
        
        // Ocultar admin dashboard
        document.getElementById('admin-dashboard-section').classList.add('d-none');
        
        // Mostrar employee dashboard
        const employeeSection = document.getElementById('employee-dashboard-section');
        employeeSection.classList.remove('d-none');
        employeeSection.style.display = 'block';
        employeeSection.style.visibility = 'visible';
        employeeSection.style.opacity = '1';
        employeeSection.style.position = 'relative';
        employeeSection.style.top = 'auto';
        employeeSection.style.left = 'auto';
        
        // Actualizar navegación
        document.getElementById('nav-login').classList.add('d-none');
        document.getElementById('nav-logout').classList.remove('d-none');
        document.getElementById('nav-admin-dashboard').classList.add('d-none');
        document.getElementById('nav-employee-dashboard').classList.remove('d-none');
        
        // Renderizar contenido
        renderEmployeeAssignedServices(1);
        renderEmployeeNotifications(1);
        renderEmployeeReportReplies(1);
        updateNotificationBadges(); // Update badges for employee
        
        console.log('Employee dashboard mostrado correctamente');
    } else {
        showAlert('Acceso denegado. Solo empleados.');
        showLogin();
    }
}

function logout() {
    currentUser = null;
    
    // Cerrar el menú hamburguesa si está abierto
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: false});
        bsCollapse.hide();
    }
    
    showLogin();
    //showAlert('Sesión cerrada.');
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
        console.log('Login exitoso:', currentUser);
        
        // Cerrar el menú hamburguesa si está abierto
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse.classList.contains('show')) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: false});
            bsCollapse.hide();
        }
        
        if (currentUser.role === 'admin') {
            console.log('Mostrando dashboard de administrador');
            showAdminDashboard();
        } else if (currentUser.role === 'employee') {
            console.log('Mostrando dashboard de empleado');
            showEmployeeDashboard();
        }
    } else {
        loginError.textContent = 'Usuario o contraseña incorrectos.';
        console.log('Login fallido');
    }
});

// --- User Management (Admin) ---

// Variables de paginación para usuarios
let currentUserPage = 1;

// Variables de paginación para servicios del admin
let currentAdminServicesPage = 1;
let currentAdminServicesData = [];

// Variables de paginación para servicios asignados
let currentAssignedServicesPage = 1;

// Variables de paginación para servicios del empleado
let currentEmployeeServicesPage = 1;

// Variables de paginación para notificaciones
let currentAdminNotificationsPage = 1;
let currentEmployeeNotificationsPage = 1;

// Variables de paginación para respuestas de reportes del empleado
let currentEmployeeReportRepliesPage = 1;

// Variables de paginación para reportes
let currentReportsPage = 1;

function renderUserList(page = 1) {
    currentUserPage = page;
    const userListElement = document.getElementById('user-list');
    const userTable = userListElement.closest('table');
    const userTableHeader = userTable.querySelector('thead');
    
    // Agregar encabezado de numeración si no existe
    if (!userTableHeader.querySelector('th:first-child').innerHTML.includes('bi-hash')) {
        addNumberHeader(userTableHeader);
    }
    
    userListElement.innerHTML = '';
    
    const totalPages = getTotalPages(users.length);
    const paginatedUsers = paginateArray(users, page);
    
    if (paginatedUsers.length === 0) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="4" class="text-center text-muted py-4">
                <i class="bi bi-people" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay usuarios registrados</strong>
            </td>
        `;
        userListElement.appendChild(noResultsRow);
    } else {
        paginatedUsers.forEach(user => {
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
        
        // Agregar numeración a las filas
        addRowNumbers(userListElement, (page - 1) * ITEMS_PER_PAGE + 1);
    }
    
    // Generar controles de paginación
    const paginationContainer = userTable.closest('.card-body');
    const existingPagination = paginationContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'user-pagination';
    paginationDiv.className = 'pagination-container';
    paginationContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'user-pagination', renderUserList);
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
    renderUserList(1);
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
        renderUserList(1);
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
        renderAdminServicesList(services, 1);
        renderAssignedServicesList(1);
        renderEmployeeAssignedServices(1); // Refresh for other employees
            //showAlert('Usuario eliminado exitosamente.');
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


function renderAdminServicesList(filteredServices = services, page = 1) {
    currentAdminServicesPage = page;
    currentAdminServicesData = filteredServices;
    
    const servicesListElement = document.getElementById('services-list-admin');
    const servicesTable = servicesListElement.closest('table');
    const servicesTableHeader = servicesTable.querySelector('thead');
    
    // Agregar encabezado de numeración si no existe
    if (!servicesTableHeader.querySelector('th:first-child').innerHTML.includes('bi-hash')) {
        addNumberHeader(servicesTableHeader);
    }
    
    servicesListElement.innerHTML = '';
    
    const totalPages = getTotalPages(filteredServices.length);
    const paginatedServices = paginateArray(filteredServices, page);
    
    if (paginatedServices.length === 0) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="8" class="text-center text-muted py-4">
                <i class="bi bi-search" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No se encontraron servicios</strong>
                <br>
                <small>Intenta ajustar los filtros de búsqueda</small>
            </td>
        `;
        servicesListElement.appendChild(noResultsRow);
    } else {
        paginatedServices.forEach(service => {
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
        
        // Agregar numeración a las filas
        addRowNumbers(servicesListElement, (page - 1) * ITEMS_PER_PAGE + 1);
    }
    
    // Generar controles de paginación
    const paginationContainer = servicesTable.closest('.card-body');
    const existingPagination = paginationContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'admin-services-pagination';
    paginationDiv.className = 'pagination-container';
    paginationContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'admin-services-pagination', (newPage) => {
        renderAdminServicesList(currentAdminServicesData, newPage);
    });
    
    // Actualizar estadísticas cuando se renderiza la lista
    updateServicesStatistics(filteredServices);
}

function filterServices() {
    const searchTerm = document.getElementById('search-services').value.toLowerCase();
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    let filtered = services;

    // Filtrar por término de búsqueda
    if (searchTerm) {
        filtered = filtered.filter(service => {
            const clientName = service.clientName.toLowerCase();
            const safeType = service.safeType.toLowerCase();
            const technicianName = getTechnicianNameById(service.technicianId).toLowerCase();
            const status = service.status.toLowerCase();
            
            return clientName.includes(searchTerm) ||
                   safeType.includes(searchTerm) ||
                   technicianName.includes(searchTerm) ||
                   status.includes(searchTerm);
        });
    }

    // Filtrar por fecha desde
    if (dateFrom) {
        filtered = filtered.filter(service => service.date >= dateFrom);
    }

    // Filtrar por fecha hasta
    if (dateTo) {
        filtered = filtered.filter(service => service.date <= dateTo);
    }

    renderAdminServicesList(filtered);
    updateServicesStatistics(filtered);
}

function clearFilters() {
    document.getElementById('search-services').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    filterServices();
}

function updateServicesStatistics(servicesToCount = services) {
    const total = servicesToCount.length;
    const completed = servicesToCount.filter(s => s.status === 'Finalizado').length;
    const inProgress = servicesToCount.filter(s => s.status === 'En proceso').length;
    const pending = servicesToCount.filter(s => s.status === 'Pendiente').length;
    const cancelled = servicesToCount.filter(s => s.status === 'Cancelado').length;

    document.getElementById('total-services-count').textContent = total;
    document.getElementById('completed-services-count').textContent = completed;
    document.getElementById('in-progress-services-count').textContent = inProgress;
    document.getElementById('pending-services-count').textContent = pending;
    document.getElementById('cancelled-services-count').textContent = cancelled;
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
            const options = {
                enableHighAccuracy: true,  // Solicitar la mejor precisión disponible
                timeout: 20000,           // Timeout de 20 segundos
                maximumAge: 0             // No usar ubicación en caché, obtener ubicación fresca
            };

            // Mostrar mensaje de carga
            showAlert('Obteniendo ubicación precisa para finalizar/cancelar servicio... Por favor espera.');

            // Función para obtener ubicación con múltiples intentos si es necesario
            function getPreciseFinalizationLocation(attempts = 0) {
                navigator.geolocation.getCurrentPosition((position) => {
                    console.log('Ubicación de finalización obtenida (intento ' + (attempts + 1) + '):', position.coords);
                    
                    // Verificar si la precisión es aceptable (menos de 10 metros)
                    if (position.coords.accuracy <= 10) {
                        saveFinalizationLocation(position.coords);
                    } else if (attempts < 2) {
                        // Si la precisión no es buena, intentar de nuevo
                        console.log('Precisión insuficiente (' + position.coords.accuracy + 'm), reintentando...');
                        setTimeout(() => getPreciseFinalizationLocation(attempts + 1), 2000);
                    } else {
                        // Si después de 3 intentos no se obtiene buena precisión, usar la mejor disponible
                        console.log('Usando mejor precisión disponible: ' + position.coords.accuracy + 'm');
                        saveFinalizationLocation(position.coords);
                    }
                }, (error) => {
                    console.error('Error al obtener ubicación de finalización (intento ' + (attempts + 1) + '):', error);
                    let errorMessage = 'No se pudo obtener la ubicación para la finalización/cancelación. ';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Permiso denegado. Por favor, permite el acceso a la ubicación en tu navegador.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Información de ubicación no disponible. Verifica que el GPS esté activado.';
                            break;
                        case error.TIMEOUT:
                            if (attempts < 2) {
                                // Reintentar en caso de timeout
                                console.log('Timeout, reintentando...');
                                setTimeout(() => getPreciseFinalizationLocation(attempts + 1), 3000);
                                return;
                            }
                            errorMessage += 'Tiempo de espera agotado. Intenta de nuevo.';
                            break;
                        default:
                            errorMessage += 'Error desconocido. Asegúrate de que la ubicación esté activada y permitida.';
                    }
                    
                    showAlert(errorMessage);
                    return; // Stop if location cannot be obtained
                }, options);
            }

            function saveFinalizationLocation(coords) {
                const timestamp = new Date().toISOString();
                finalizationOrCancellationTime = timestamp;
                finalizationOrCancellationLocation = {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    accuracy: coords.accuracy,
                    timestamp: timestamp,
                    altitude: coords.altitude || null,
                    heading: coords.heading || null,
                    speed: coords.speed || null
                };
                // Proceed to save once location is obtained
                finalizeServiceSave();
            }

            // Iniciar el proceso de obtención de ubicación
            getPreciseFinalizationLocation();
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
            finalizationOrCancellationTime: finalizationOrCancellationTime,
            finalizationOrCancellationLocation: finalizationOrCancellationLocation
        };

        if (serviceId) {
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                if (['Finalizado', 'Cancelado'].includes(services[serviceIndex].status) && currentUser.role === 'admin' && serviceId) {
                    if (['Finalizado', 'Cancelado'].includes(services[serviceIndex].status) && currentUser.role === 'admin' && services[serviceIndex].status === newService.status && services[serviceIndex].technicianId === newService.technicianId) {
                        showAlert('No se puede editar un servicio finalizado o cancelado.');
                        return;
                    }
                }
                services[serviceIndex] = newService;
            }
        } else {
            services.push(newService);
        }
        saveServices();
        renderAdminServicesList(services, 1);
        populateAssignServiceDropdown();
        
        // Cerrar el modal después de guardar exitosamente
        const modal = bootstrap.Modal.getInstance(document.getElementById('registerServiceModal'));
        if (modal) {
            modal.hide();
        }
        
        document.getElementById('service-form').reset();
        clearSignaturePad('client');
        clearSignaturePad('technician');
        document.getElementById('service-photo-preview').classList.add('d-none');
        document.getElementById('edit-service-id').value = '';
        document.getElementById('service-photo').value = '';

        if (currentUser.role === 'employee') {
            renderEmployeeAssignedServices(1);
        }
        //showAlert('Servicio guardado exitosamente.');
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
            renderAdminServicesList(services, 1);
            populateAssignServiceDropdown();
            renderAssignedServicesList(1);
            renderEmployeeAssignedServices(1);
            //showAlert('Servicio eliminado exitosamente.'); // Confirmation for admin
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
            <p><strong>Ubicación:</strong> ${service.location}
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.location)}" 
                   target="_blank" class="btn-google-maps" title="Abrir en Google Maps">
                    <i class="bi bi-geo-alt"></i> Ver en Maps
                </a>
            </p>
            <p><strong>Técnico Encargado:</strong> ${getTechnicianNameById(service.technicianId)}</p>
            <p><strong>Nombre del Cliente:</strong> ${service.clientName}</p>
            <p><strong>Teléfono del Cliente:</strong> ${service.clientPhone}</p>
            <p><strong>Estado:</strong> ${service.status}</p>
            ${service.cancellationReason ? `<p><strong>Motivo de Cancelación:</strong> ${service.cancellationReason}</p>` : ''}
            ${service.startTime ? `<p><strong>Hora de Inicio:</strong> ${new Date(service.startTime).toLocaleString()}</p>` : ''}
            ${service.startLocation ? `<p><strong>Ubicación de Inicio:</strong> Lat: ${service.startLocation.latitude.toFixed(8)}, Lon: ${service.startLocation.longitude.toFixed(8)}${service.startLocation.accuracy ? ` (Precisión: ±${Math.round(service.startLocation.accuracy)}m)` : ''}${service.startLocation.altitude ? ` | Altitud: ${service.startLocation.altitude.toFixed(1)}m` : ''}${service.startLocation.speed ? ` | Velocidad: ${service.startLocation.speed.toFixed(1)}m/s` : ''}${service.startLocation.heading ? ` | Dirección: ${service.startLocation.heading.toFixed(1)}°` : ''}
                <a href="https://www.google.com/maps?q=${service.startLocation.latitude},${service.startLocation.longitude}" 
                   target="_blank" class="btn-google-maps" title="Abrir coordenadas de inicio en Google Maps">
                    <i class="bi bi-geo-alt"></i> Ver en Maps
                </a>
            </p>` : ''}
            ${service.finalizationOrCancellationTime ? `<p><strong>Fecha/Hora de Finalización/Cancelación:</strong> ${new Date(service.finalizationOrCancellationTime).toLocaleString()}</p>` : ''}
            ${service.finalizationOrCancellationLocation ? `<p><strong>Ubicación de Finalización/Cancelación:</strong> Lat: ${service.finalizationOrCancellationLocation.latitude.toFixed(8)}, Lon: ${service.finalizationOrCancellationLocation.longitude.toFixed(8)}${service.finalizationOrCancellationLocation.accuracy ? ` (Precisión: ±${Math.round(service.finalizationOrCancellationLocation.accuracy)}m)` : ''}${service.finalizationOrCancellationLocation.altitude ? ` | Altitud: ${service.finalizationOrCancellationLocation.altitude.toFixed(1)}m` : ''}${service.finalizationOrCancellationLocation.speed ? ` | Velocidad: ${service.finalizationOrCancellationLocation.speed.toFixed(1)}m/s` : ''}${service.finalizationOrCancellationLocation.heading ? ` | Dirección: ${service.finalizationOrCancellationLocation.heading.toFixed(1)}°` : ''}
                <a href="https://www.google.com/maps?q=${service.finalizationOrCancellationLocation.latitude},${service.finalizationOrCancellationLocation.longitude}" 
                   target="_blank" class="btn-google-maps" title="Abrir coordenadas de finalización en Google Maps">
                    <i class="bi bi-geo-alt"></i> Ver en Maps
                </a>
            </p>` : ''}
            ${service.photo ? `<p><strong>Evidencia Fotográfica:</strong><br><img src="${service.photo}" class="service-photo-evidence" alt="Evidencia"></p>` : ''}
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
        renderAdminServicesList(services, 1);
        renderAssignedServicesList(1);
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

function renderAssignedServicesList(page = 1) {
    currentAssignedServicesPage = page;
    const assignedListElement = document.getElementById('assigned-services-list');
    const assignedTable = assignedListElement.closest('table');
    const assignedTableHeader = assignedTable.querySelector('thead');
    
    // Agregar encabezado de numeración si no existe
    if (!assignedTableHeader.querySelector('th:first-child').innerHTML.includes('bi-hash')) {
        addNumberHeader(assignedTableHeader);
    }
    
    assignedListElement.innerHTML = '';
    
    const assignedServices = services.filter(s => s.technicianId);
    const totalPages = getTotalPages(assignedServices.length);
    const paginatedServices = paginateArray(assignedServices, page);
    
    if (paginatedServices.length === 0) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="6" class="text-center text-muted py-4">
                <i class="bi bi-list-check" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay servicios asignados</strong>
            </td>
        `;
        assignedListElement.appendChild(noResultsRow);
    } else {
        paginatedServices.forEach(service => {
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
        
        // Agregar numeración a las filas
        addRowNumbers(assignedListElement, (page - 1) * ITEMS_PER_PAGE + 1);
    }
    
    // Generar controles de paginación
    const paginationContainer = assignedTable.closest('.card-body');
    const existingPagination = paginationContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'assigned-services-pagination';
    paginationDiv.className = 'pagination-container';
    paginationContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'assigned-services-pagination', renderAssignedServicesList);
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
                renderAdminServicesList(services, 1);
                renderAssignedServicesList(1);
                populateAssignServiceDropdown();
                // Solo notificar al técnico, no al admin
                if (oldTechnicianId) {
                    sendNotification(oldTechnicianId, `El servicio ID: ${serviceId} (Cliente: ${service.clientName}, Tipo: ${service.safeType}) ha sido DESASIGNADO por el administrador. Ya no está asignado a ti.`);
                }
                renderEmployeeAssignedServices(1);
                //showAlert('Servicio desasignado exitosamente.');
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
    renderReportsList(1);
    // Los reportes se muestran solo en la sección "Reportes/Novedades" del admin
    // No se envían notificaciones para mantener la separación entre notificaciones y reportes
    updateNotificationBadges();

    const modal = bootstrap.Modal.getInstance(document.getElementById('reportNoveltyModal'));
    modal.hide();
    document.getElementById('novelty-form').reset();
    //showAlert('Novedad reportada con éxito.');
});

function renderReportsList(page = 1) {
    currentReportsPage = page;
    const reportsListElement = document.getElementById('reports-list');
    const reportsContainer = reportsListElement.closest('.card-body');
    reportsListElement.innerHTML = '';
    
    // Ordenar reportes: primero los no leídos por admin, luego por fecha (más recientes primero)
    const sortedReports = reports.sort((a, b) => {
        // Si uno no ha sido leído por admin y el otro sí, el no leído va primero
        if (!a.readForAdmin && b.readForAdmin) return -1;
        if (a.readForAdmin && !b.readForAdmin) return 1;
        
        // Si ambos tienen el mismo estado de lectura, ordenar por fecha (más reciente primero)
        return new Date(b.date) - new Date(a.date);
    });

    const totalPages = getTotalPages(sortedReports.length);
    const paginatedReports = paginateArray(sortedReports, page);

    if (paginatedReports.length === 0) {
        reportsListElement.innerHTML = '<p>No hay reportes de novedades.</p>';
    } else {
        paginatedReports.forEach((report, index) => {
            const globalIndex = (page - 1) * ITEMS_PER_PAGE + index + 1;
            const reportDiv = document.createElement('div');
            // Agregar clases visuales para reportes no leídos
            const isUnread = !report.readForAdmin;
            reportDiv.className = `alert ${isUnread ? 'alert-danger border-danger' : 'alert-warning'}`;
            
            // Agregar indicador visual para reportes nuevos
            const unreadIndicator = isUnread ? '<span class="badge bg-danger ms-2">NUEVO</span>' : '';

            let repliesHtml = '';
            if (report.replies && report.replies.length > 0) {
                repliesHtml = '<h6 class="mt-2">Respuestas:</h6><ul class="list-group">';
                report.replies.forEach(reply => {
                    repliesHtml += `<li class="list-group-item list-group-item-light"><strong>Admin (${new Date(reply.timestamp).toLocaleString()}):</strong> ${reply.message}</li>`;
                });
                repliesHtml += '</ul>';
            }

            reportDiv.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="d-flex align-items-center">
                        <span class="badge bg-secondary me-2">${globalIndex}</span>
                        <div>
                            <strong>ID Reporte:</strong> ${report.id}
                            <strong>Fecha:</strong> ${report.date}
                            <strong>ID Servicio:</strong> ${report.serviceId}
                            <strong>Reportado por:</strong> ${report.reporterName}
                        </div>
                        ${unreadIndicator}
                    </div>
                </div>
                <div class="mt-2">
                    <strong>Descripción:</strong> ${report.description}
                </div>
                ${repliesHtml}
                <button class="btn btn-sm btn-primary mt-2" onclick="openReplyReportModal('${report.id}')">Responder</button>
            `;
            reportsListElement.appendChild(reportDiv);
        });
    }
    
    // Generar controles de paginación
    const existingPagination = reportsContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'reports-pagination';
    paginationDiv.className = 'pagination-container';
    reportsContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'reports-pagination', renderReportsList);
    
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
        renderReportsList(1);
        sendNotification(report.reporterId, `¡El administrador ha respondido a tu reporte ID ${report.id}: "${replyMessage}"`);
        updateNotificationBadges(); // Crucial for updating the badge

        const modal = bootstrap.Modal.getInstance(document.getElementById('replyReportModal'));
        modal.hide();
        document.getElementById('reply-report-form').reset();
        //showAlert('Respuesta enviada.');
    } else {
        showAlert('Error: Reporte no encontrado.');
    }
});


// --- Employee Dashboard ---

function renderEmployeeAssignedServices(page = 1) {
    currentEmployeeServicesPage = page;
    const employeeServicesList = document.getElementById('employee-assigned-services-list');
    const employeeServicesCards = document.getElementById('employee-assigned-services-cards');
    const employeeTable = employeeServicesList.closest('table');
    const employeeTableHeader = employeeTable.querySelector('thead');
    
    // Agregar encabezado de numeración si no existe
    if (!employeeTableHeader.querySelector('th:first-child').innerHTML.includes('bi-hash')) {
        addNumberHeader(employeeTableHeader);
    }
    
    employeeServicesList.innerHTML = '';
    employeeServicesCards.innerHTML = '';
    let assignedToMe = services.filter(s => s.technicianId === currentUser.id);
    
    // Aplicar filtro de estado
    if (currentEmployeeServicesFilter !== 'todos') {
        assignedToMe = assignedToMe.filter(s => s.status === currentEmployeeServicesFilter);
    }
    
    const totalPages = getTotalPages(assignedToMe.length);
    const paginatedServices = paginateArray(assignedToMe, page);

    if (paginatedServices.length === 0) {
        // Mensaje para tabla
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="7" class="text-center text-muted py-4">
                <i class="bi bi-person-check" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No tienes servicios asignados</strong>
            </td>
        `;
        employeeServicesList.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-person-check" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No tienes servicios asignados</strong>
        `;
        employeeServicesCards.appendChild(noResultsCard);
    } else {
        paginatedServices.forEach((service, index) => {
            const globalIndex = (page - 1) * ITEMS_PER_PAGE + index + 1;
            const isStatusFixed = ['Finalizado', 'Cancelado'].includes(service.status);
            const dropdownDisabled = isStatusFixed ? 'disabled' : '';
            const dropdownTitle = isStatusFixed ? 'No se puede cambiar el estado de un servicio finalizado/cancelado' : '';
            const showStartButton = service.status === 'Pendiente';

            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
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
            
            // Generar tarjeta móvil (vista móvil)
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            
            // Determinar clase de estado para la tarjeta
            let statusClass = '';
            switch(service.status) {
                case 'Pendiente':
                    statusClass = 'status-pendiente';
                    break;
                case 'En proceso':
                    statusClass = 'status-en-proceso';
                    break;
                case 'Finalizado':
                    statusClass = 'status-finalizado';
                    break;
                case 'Cancelado':
                    statusClass = 'status-cancelado';
                    break;
            }
            
            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${service.id}</span>
                    <span class="service-card-status ${statusClass}">${service.status}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Cliente:</span>
                        <span class="service-card-info-value">${service.clientName}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Tipo Caja:</span>
                        <span class="service-card-info-value">${service.safeType}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Ubicación:</span>
                        <span class="service-card-info-value">${service.location}</span>
                    </div>
                </div>
                <div class="service-card-actions">
                    <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')">Ver</button>
                    <div class="dropdown d-inline-block">
                        <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="dropdownMenuButtonMobile${service.id}" data-bs-toggle="dropdown" aria-expanded="false" ${dropdownDisabled} title="${dropdownTitle}">
                            Estado
                        </button>
                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButtonMobile${service.id}">
                            <li><a class="dropdown-item ${isStatusFixed || service.status === 'Pendiente' ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed} && '${service.status}' !== 'Pendiente') handleEmployeeServiceStatusChange('${service.id}', 'Pendiente')">Pendiente</a></li>
                            <li><a class="dropdown-item ${isStatusFixed || service.status === 'En proceso' ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed} && '${service.status}' !== 'En proceso') handleEmployeeServiceStatusChange('${service.id}', 'En proceso')">En proceso</a></li>
                            <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Finalizado')">Finalizado</a></li>
                            <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Cancelado')">Cancelado</a></li>
                        </ul>
                    </div>
                    ${showStartButton ? `<button class="btn btn-success btn-sm" onclick="startService('${service.id}')">Iniciar</button>` : ''}
                    <button class="btn btn-danger btn-sm" data-bs-toggle="modal" data-bs-target="#reportNoveltyModal" onclick="prefillNoveltyServiceId('${service.id}')">Novedad</button>
                </div>
            `;
            employeeServicesCards.appendChild(serviceCard);
        });
        
        // Agregar numeración a las filas
        addRowNumbers(employeeServicesList, (page - 1) * ITEMS_PER_PAGE + 1);
    }
    
    // Generar controles de paginación
    const paginationContainer = employeeTable.closest('.card-body');
    const existingPagination = paginationContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'employee-services-pagination';
    paginationDiv.className = 'pagination-container';
    paginationContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'employee-services-pagination', renderEmployeeAssignedServices);
    
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
            const options = {
                enableHighAccuracy: true,  // Solicitar la mejor precisión disponible
                timeout: 20000,           // Timeout de 20 segundos
                maximumAge: 0             // No usar ubicación en caché, obtener ubicación fresca
            };

            // Mostrar mensaje de carga
            showAlert('Obteniendo ubicación precisa para finalizar/cancelar servicio... Por favor espera.');

            // Función para obtener ubicación con múltiples intentos si es necesario
            function getPreciseStatusChangeLocation(attempts = 0) {
                navigator.geolocation.getCurrentPosition((position) => {
                    console.log('Ubicación de cambio de estado obtenida (intento ' + (attempts + 1) + '):', position.coords);
                    
                    // Verificar si la precisión es aceptable (menos de 10 metros)
                    if (position.coords.accuracy <= 10) {
                        saveStatusChangeLocation(position.coords);
                    } else if (attempts < 2) {
                        // Si la precisión no es buena, intentar de nuevo
                        console.log('Precisión insuficiente (' + position.coords.accuracy + 'm), reintentando...');
                        setTimeout(() => getPreciseStatusChangeLocation(attempts + 1), 2000);
                    } else {
                        // Si después de 3 intentos no se obtiene buena precisión, usar la mejor disponible
                        console.log('Usando mejor precisión disponible: ' + position.coords.accuracy + 'm');
                        saveStatusChangeLocation(position.coords);
                    }
                }, (error) => {
                    console.error('Error al obtener ubicación de cambio de estado (intento ' + (attempts + 1) + '):', error);
                    let errorMessage = 'No se pudo obtener la ubicación para la finalización/cancelación. ';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Permiso denegado. Por favor, permite el acceso a la ubicación en tu navegador.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Información de ubicación no disponible. Verifica que el GPS esté activado.';
                            break;
                        case error.TIMEOUT:
                            if (attempts < 2) {
                                // Reintentar en caso de timeout
                                console.log('Timeout, reintentando...');
                                setTimeout(() => getPreciseStatusChangeLocation(attempts + 1), 3000);
                                return;
                            }
                            errorMessage += 'Tiempo de espera agotado. Intenta de nuevo.';
                            break;
                        default:
                            errorMessage += 'Error desconocido. Asegúrate de que la ubicación esté activada y permitida.';
                    }
                    
                    showAlert(errorMessage);
                    return; // Stop if location cannot be obtained
                }, options);
            }

            function saveStatusChangeLocation(coords) {
                const timestamp = new Date().toISOString();
                oldService.finalizationOrCancellationTime = timestamp;
                oldService.finalizationOrCancellationLocation = {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    accuracy: coords.accuracy,
                    timestamp: timestamp,
                    altitude: coords.altitude || null,
                    heading: coords.heading || null,
                    speed: coords.speed || null
                };
                saveAndNotify();
            }

            // Iniciar el proceso de obtención de ubicación
            getPreciseStatusChangeLocation();
        } else {
            saveAndNotify();
        }

        function saveAndNotify() {
            saveServices();
            renderEmployeeAssignedServices(1);
            renderAdminServicesList(services, 1);
            sendNotification('admin', `El servicio ID: ${id} ha cambiado de estado de "${oldStatus}" a "${newStatus}" por el técnico ${currentUser.username}. ${newStatus === 'Cancelado' ? `Motivo: ${cancellationReason}` : ''}`);
            //showAlert(`Estado del servicio ID ${id} cambiado a "${newStatus}".`);
        }
    }
}

function startService(serviceId) {
    if (navigator.geolocation) {
        // Configuración mejorada para obtener la ubicación más precisa
        const options = {
            enableHighAccuracy: true,  // Solicitar la mejor precisión disponible
            timeout: 20000,           // Timeout de 20 segundos para dar más tiempo
            maximumAge: 0             // No usar ubicación en caché, obtener ubicación fresca
        };

        // Mostrar mensaje de carga
        showAlert('Obteniendo ubicación precisa... Por favor espera.');

        // Función para obtener ubicación con múltiples intentos si es necesario
        function getPreciseLocation(attempts = 0) {
            navigator.geolocation.getCurrentPosition((position) => {
                console.log('Ubicación obtenida (intento ' + (attempts + 1) + '):', position.coords);
                
                // Verificar si la precisión es aceptable (menos de 10 metros)
                if (position.coords.accuracy <= 10) {
                    saveServiceLocation(serviceId, position.coords);
                } else if (attempts < 2) {
                    // Si la precisión no es buena, intentar de nuevo
                    console.log('Precisión insuficiente (' + position.coords.accuracy + 'm), reintentando...');
                    setTimeout(() => getPreciseLocation(attempts + 1), 2000);
                } else {
                    // Si después de 3 intentos no se obtiene buena precisión, usar la mejor disponible
                    console.log('Usando mejor precisión disponible: ' + position.coords.accuracy + 'm');
                    saveServiceLocation(serviceId, position.coords);
                }
            }, (error) => {
                console.error('Error al obtener la ubicación (intento ' + (attempts + 1) + '):', error);
                let errorMessage = 'No se pudo obtener la ubicación. ';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Permiso denegado. Por favor, permite el acceso a la ubicación en tu navegador.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Información de ubicación no disponible. Verifica que el GPS esté activado.';
                        break;
                    case error.TIMEOUT:
                        if (attempts < 2) {
                            // Reintentar en caso de timeout
                            console.log('Timeout, reintentando...');
                            setTimeout(() => getPreciseLocation(attempts + 1), 3000);
                            return;
                        }
                        errorMessage += 'Tiempo de espera agotado. Intenta de nuevo.';
                        break;
                    default:
                        errorMessage += 'Error desconocido. Asegúrate de que la ubicación esté activada y permitida.';
                }
                
                showAlert(errorMessage);
            }, options);
        }

        // Iniciar el proceso de obtención de ubicación
        getPreciseLocation();
    } else {
        showAlert('Tu navegador no soporta la geolocalización.');
    }
}

function saveServiceLocation(serviceId, coords) {
    const serviceIndex = services.findIndex(s => s.id === serviceId);
    if (serviceIndex !== -1) {
        if (['Finalizado', 'Cancelado', 'En proceso'].includes(services[serviceIndex].status)) {
            showAlert('Este servicio ya está en proceso, finalizado o cancelado.');
            return;
        }

        // Agregar timestamp único para diferenciar ubicaciones en el mismo lugar
        const timestamp = new Date().toISOString();
        
        services[serviceIndex].startTime = timestamp;
        services[serviceIndex].startLocation = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            timestamp: timestamp,
            altitude: coords.altitude || null,
            heading: coords.heading || null,
            speed: coords.speed || null
        };
        services[serviceIndex].status = 'En proceso';
        saveServices();
        renderEmployeeAssignedServices(1);
        renderAdminServicesList(services, 1);

        const message = `El técnico ${currentUser.username} ha iniciado el servicio ID: ${serviceId} a las ${new Date().toLocaleString()} en la ubicación: Lat ${coords.latitude.toFixed(8)}, Lon ${coords.longitude.toFixed(8)} (Precisión: ±${Math.round(coords.accuracy)}m).`;
        sendNotification('admin', message);
        showAlert(`Servicio iniciado exitosamente. Ubicación: Lat ${coords.latitude.toFixed(8)}, Lon ${coords.longitude.toFixed(8)} (Precisión: ±${Math.round(coords.accuracy)}m)`);
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
            // Evitar duplicar notificaciones para el mismo usuario con el mismo mensaje
            const existingNotification = notifications.find(n => 
                n.userId === user.id && 
                n.message === message && 
                !n.read &&
                (new Date() - new Date(n.timestamp)) < 60000 // Solo verificar notificaciones de los últimos 60 segundos
            );
            
            if (!existingNotification) {
                notifications.push({
                    id: generateId(),
                    userId: user.id,
                    message: message,
                    timestamp: new Date().toISOString(),
                    read: false
                });
            }
        });
        saveNotifications();
        updateNotificationBadges();
    }
}

function renderAdminNotifications(page = 1) {
    currentAdminNotificationsPage = page;
    const notificationsList = document.getElementById('admin-notifications-list');
    const notificationsContainer = notificationsList.closest('.card-body');
    
    notificationsList.innerHTML = '';
    const adminNotifications = notifications.filter(n => {
        const targetUser = users.find(u => u.id === n.userId);
        return targetUser && targetUser.role === 'admin';
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const totalPages = getTotalPages(adminNotifications.length);
    const paginatedNotifications = paginateArray(adminNotifications, page);

    if (paginatedNotifications.length === 0) {
        notificationsList.innerHTML = '<p>No hay notificaciones para administradores.</p>';
    } else {
        paginatedNotifications.forEach((n, index) => {
            const notificationDiv = document.createElement('div');
            notificationDiv.className = `alert ${n.read ? 'alert-light' : 'alert-info'} d-flex justify-content-between align-items-center`;
            notificationDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="badge bg-secondary me-2">${(page - 1) * ITEMS_PER_PAGE + index + 1}</span>
                    <div>
                        <strong>${new Date(n.timestamp).toLocaleString()}:</strong> ${n.message}
                    </div>
                </div>
                ${!n.read ? `<button class="btn btn-sm btn-outline-primary" onclick="markNotificationAsRead('${n.id}')">Marcar como leído</button>` : ''}
            `;
            notificationsList.appendChild(notificationDiv);
        });
    }
    
    // Generar controles de paginación
    const existingPagination = notificationsContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'admin-notifications-pagination';
    paginationDiv.className = 'pagination-container';
    notificationsContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'admin-notifications-pagination', renderAdminNotifications);
    
    updateNotificationBadges();
}

function renderEmployeeNotifications(page = 1) {
    currentEmployeeNotificationsPage = page;
    const notificationsList = document.getElementById('employee-notifications-list');
    const notificationsContainer = notificationsList.closest('.card-body');
    notificationsList.innerHTML = '';
    if (!currentUser) return;

    const employeeNotifications = notifications.filter(n => n.userId === currentUser.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Solo mostrar notificaciones regulares (excluyendo respuestas de reportes)
    const regularNotifications = employeeNotifications.filter(n => !n.message.includes('ha respondido a tu reporte'));

    const totalPages = getTotalPages(regularNotifications.length);
    const paginatedNotifications = paginateArray(regularNotifications, page);

    if (paginatedNotifications.length === 0) {
        notificationsList.innerHTML = '<p>No hay notificaciones para ti.</p>';
    } else {
        paginatedNotifications.forEach((n, index) => {
            const globalIndex = (page - 1) * ITEMS_PER_PAGE + index + 1;
            
            const notificationDiv = document.createElement('div');
            notificationDiv.className = `alert ${n.read ? 'alert-light' : 'alert-info'} d-flex justify-content-between align-items-center`;
            notificationDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="badge bg-secondary me-2">${globalIndex}</span>
                    <div>
                        <strong>${new Date(n.timestamp).toLocaleString()}:</strong> ${n.message}
                    </div>
                </div>
                ${!n.read ? `<button class="btn btn-sm btn-outline-primary" onclick="markNotificationAsRead('${n.id}')">Marcar como leído</button>` : ''}
            `;
            notificationsList.appendChild(notificationDiv);
        });
    }
    
    // Generar controles de paginación
    const existingPagination = notificationsContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'employee-notifications-pagination';
    paginationDiv.className = 'pagination-container';
    notificationsContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'employee-notifications-pagination', renderEmployeeNotifications);
    
    updateNotificationBadges();
}

function renderEmployeeReportReplies(page = 1) {
    currentEmployeeReportRepliesPage = page;
    const reportRepliesList = document.getElementById('employee-report-replies-list');
    const reportRepliesContainer = reportRepliesList.closest('.card-body');
    reportRepliesList.innerHTML = '';
    if (!currentUser) return;

    const employeeReportsWithReplies = reports.filter(r => r.reporterId === currentUser.id && r.replies.length > 0);

    // Obtener todas las respuestas no leídas
    let allReplies = [];
    let replyCounter = 0;

    employeeReportsWithReplies.forEach(report => {
        report.replies.filter(reply => !reply.readForTechnician).forEach(reply => {
            allReplies.push({
                report: report,
                reply: reply,
                index: replyCounter++
            });
        });
    });

    const totalPages = getTotalPages(allReplies.length);
    const paginatedReplies = paginateArray(allReplies, page);

    if (paginatedReplies.length === 0) {
        reportRepliesList.innerHTML = '<p class="no-replies-message">No hay respuestas nuevas a tus reportes.</p>';
    } else {
        paginatedReplies.forEach((item, index) => {
            const globalIndex = (page - 1) * ITEMS_PER_PAGE + index + 1;
            const { report, reply } = item;
            
            const replyDiv = document.createElement('div');
            replyDiv.className = `alert alert-success d-flex justify-content-between align-items-center`;
            replyDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="badge bg-success me-2">${globalIndex}</span>
                    <div>
                        <strong>Respuesta a Reporte ID ${report.id} (${new Date(reply.timestamp).toLocaleString()}):</strong> ${reply.message}
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-success" onclick="markReportReplyAsRead('${report.id}', '${reply.timestamp}')">Marcar como leído</button>
            `;
            reportRepliesList.appendChild(replyDiv);
        });
    }
    
    // Generar controles de paginación
    const existingPagination = reportRepliesContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'employee-report-replies-pagination';
    paginationDiv.className = 'pagination-container';
    reportRepliesContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'employee-report-replies-pagination', renderEmployeeReportReplies);
    
    updateNotificationBadges();
}

function markNotificationAsRead(id) {
    const notificationIndex = notifications.findIndex(n => n.id === id);
    if (notificationIndex !== -1) {
        notifications[notificationIndex].read = true;
        saveNotifications();
        updateNotificationBadges();
        if (currentUser && currentUser.role === 'admin') {
            renderAdminNotifications(1);
        } else if (currentUser && currentUser.role === 'employee') {
            renderEmployeeNotifications(1);
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
            renderEmployeeNotifications(1);
            renderEmployeeReportReplies(1);
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
        const unreadEmployeeNotificationsCount = notifications.filter(n => 
            n.userId === currentUser.id && 
            !n.read && 
            !n.message.includes('ha respondido a tu reporte')
        ).length;
        const unreadReportRepliesCount = reports.filter(r => r.reporterId === currentUser.id && r.replies.some(reply => !reply.readForTechnician)).length;

        // Actualizar badge de notificaciones
        if (unreadEmployeeNotificationsCount > 0) {
            employeeNotificationsTab.innerHTML = `Notificaciones <span class="badge bg-danger ms-1">${unreadEmployeeNotificationsCount}</span>`;
        } else {
            employeeNotificationsTab.innerHTML = `Notificaciones`;
        }

        // Actualizar badge de respuestas de reportes
        const employeeReportRepliesTab = document.getElementById('employee-report-replies-tab');
        if (employeeReportRepliesTab) {
            if (unreadReportRepliesCount > 0) {
                employeeReportRepliesTab.innerHTML = `Respuestas de Reportes <span class="badge bg-success ms-1">${unreadReportRepliesCount}</span>`;
            } else {
                employeeReportRepliesTab.innerHTML = `Respuestas de Reportes`;
            }
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
    // Obtener los servicios filtrados actualmente
    const searchTerm = document.getElementById('search-services').value.toLowerCase();
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    let servicesToExport = services;

    // Aplicar los mismos filtros que en la vista
    if (searchTerm) {
        servicesToExport = servicesToExport.filter(service => {
            const clientName = service.clientName.toLowerCase();
            const safeType = service.safeType.toLowerCase();
            const technicianName = getTechnicianNameById(service.technicianId).toLowerCase();
            const status = service.status.toLowerCase();
            
            return clientName.includes(searchTerm) ||
                   safeType.includes(searchTerm) ||
                   technicianName.includes(searchTerm) ||
                   status.includes(searchTerm);
        });
    }

    if (dateFrom) {
        servicesToExport = servicesToExport.filter(service => service.date >= dateFrom);
    }

    if (dateTo) {
        servicesToExport = servicesToExport.filter(service => service.date <= dateTo);
    }

    // Ajustamos los datos del servicio para hacerlos más legibles en el Excel
    const servicesToExportFormatted = servicesToExport.map(service => {
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
            'Ubicación de Inicio (Lat)': service.startLocation ? service.startLocation.latitude.toFixed(8) : 'N/A',
            'Ubicación de Inicio (Lon)': service.startLocation ? service.startLocation.longitude.toFixed(8) : 'N/A',
            'Precisión de Inicio (m)': service.startLocation && service.startLocation.accuracy ? Math.round(service.startLocation.accuracy) : 'N/A',
            'Altitud de Inicio (m)': service.startLocation && service.startLocation.altitude ? service.startLocation.altitude.toFixed(1) : 'N/A',
            'Velocidad de Inicio (m/s)': service.startLocation && service.startLocation.speed ? service.startLocation.speed.toFixed(1) : 'N/A',
            'Dirección de Inicio (°)': service.startLocation && service.startLocation.heading ? service.startLocation.heading.toFixed(1) : 'N/A',
            'Hora de Finalización/Cancelación': service.finalizationOrCancellationTime ? new Date(service.finalizationOrCancellationTime).toLocaleString() : 'N/A',
            'Ubicación de Finalización/Cancelación (Lat)': service.finalizationOrCancellationLocation ? service.finalizationOrCancellationLocation.latitude.toFixed(8) : 'N/A',
            'Ubicación de Finalización/Cancelación (Lon)': service.finalizationOrCancellationLocation ? service.finalizationOrCancellationLocation.longitude.toFixed(8) : 'N/A',
            'Precisión de Finalización (m)': service.finalizationOrCancellationLocation && service.finalizationOrCancellationLocation.accuracy ? Math.round(service.finalizationOrCancellationLocation.accuracy) : 'N/A',
            'Altitud de Finalización (m)': service.finalizationOrCancellationLocation && service.finalizationOrCancellationLocation.altitude ? service.finalizationOrCancellationLocation.altitude.toFixed(1) : 'N/A',
            'Velocidad de Finalización (m/s)': service.finalizationOrCancellationLocation && service.finalizationOrCancellationLocation.speed ? service.finalizationOrCancellationLocation.speed.toFixed(1) : 'N/A',
            'Dirección de Finalización (°)': service.finalizationOrCancellationLocation && service.finalizationOrCancellationLocation.heading ? service.finalizationOrCancellationLocation.heading.toFixed(1) : 'N/A'
        };
    });
    
    const filename = `servicios_${new Date().toISOString().split('T')[0]}`;
    exportToExcel(servicesToExportFormatted, filename);
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
    // Inicializar tema
    initializeTheme();
    
    // Inicializar scroll to top
    initializeScrollToTop();
    
    // ELIMINAR la inicialización de navegación táctil personalizada
    // initializeTableNavigation();
    
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

        // Agregar evento para limpiar el modal de alerta cuando se cierre
        const customAlertModalElement = document.getElementById('customAlertModal');
        if (customAlertModalElement) {
            customAlertModalElement.addEventListener('hidden.bs.modal', () => {
                // Limpiar el contenido del modal
                document.getElementById('customAlertModalBody').textContent = '';
                // Habilitar interacciones con la página
                document.body.style.pointerEvents = 'auto';
                document.body.style.overflow = 'auto';
            });
        }

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

// Nota: Tendrás que encapsular tu lógica de guardado en una nueva función
// llamada `saveServiceLogic` para que se ejecute después del redimensionamiento.

function resizeImage(img, maxWidth, maxHeight) {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    // Calcular el ratio para mantener las proporciones
    if (width > height) {
        if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
        }
        } else {
        if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
        }
    }
    
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // Devolver la imagen redimensionada como data URL con calidad de compresión (0.7 por ejemplo)
    return canvas.toDataURL('image/jpeg', 'image/jpg', 'image/png', 0.7);
}

// Función para probar la geolocalización
function testGeolocation() {
    console.log('Iniciando test de geolocalización');
    
    if (!navigator.geolocation) {
        console.log('Geolocalización no soportada');
        showAlert('Tu navegador no soporta la geolocalización.');
        return;
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    };

    console.log('Opciones de geolocalización:', options);

    // Mostrar mensaje de carga simple
    //showAlert('Obteniendo ubicación actual... Por favor espera.');

    navigator.geolocation.getCurrentPosition((position) => {
        console.log('Geolocalización exitosa:', position);
        
        const coords = position.coords;
        const accuracy = Math.round(coords.accuracy);
        
        let message = `✅ Ubicación obtenida exitosamente:\n\n`;
        message += `📍 Latitud: ${coords.latitude.toFixed(6)}\n`;
        message += `📍 Longitud: ${coords.longitude.toFixed(6)}\n`;
        message += `🎯 Precisión: ±${accuracy} metros\n`;
        message += `📏 Altitud: ${coords.altitude ? `${coords.altitude.toFixed(1)}m` : 'No disponible'}\n`;
        message += `🚀 Velocidad: ${coords.speed ? `${coords.speed.toFixed(1)}m/s` : 'No disponible'}\n`;
        message += `🧭 Dirección: ${coords.heading ? `${coords.heading.toFixed(1)}°` : 'No disponible'}\n\n`;
        message += `🌐 Puedes verificar estas coordenadas en Google Maps:`;
        message += `\nhttps://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;

        console.log('Mensaje a mostrar:', message);

        // Cerrar el modal actual y mostrar el resultado
        const currentModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
        if (currentModal) {
            currentModal.hide();
        }
        
        // Mostrar el resultado después de un breve delay
        setTimeout(() => {
            console.log('Mostrando resultado de geolocalización');
            showAlert(message);
        }, 300);
        
        // También mostrar en consola para debugging
        console.log('Test de geolocalización exitoso:', {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            altitude: coords.altitude,
            speed: coords.speed,
            heading: coords.heading
        });
    }, (error) => {
        console.error('Error en test de geolocalización:', error);
        let errorMessage = '❌ Error al obtener ubicación:\n\n';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage += '❌ Permiso denegado\n\n';
                errorMessage += 'Para solucionarlo:\n';
                errorMessage += '1. Haz clic en el ícono de ubicación en la barra de direcciones\n';
                errorMessage += '2. Selecciona "Permitir"\n';
                errorMessage += '3. Recarga la página';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage += '❌ Información de ubicación no disponible\n\n';
                errorMessage += 'Posibles causas:\n';
                errorMessage += '• GPS desactivado en el dispositivo\n';
                errorMessage += '• Sin señal GPS\n';
                errorMessage += '• Problemas de conectividad';
                break;
            case error.TIMEOUT:
                errorMessage += '❌ Tiempo de espera agotado\n\n';
                errorMessage += 'Intenta de nuevo en unos segundos';
                break;
            default:
                errorMessage += '❌ Error desconocido\n\n';
                errorMessage += 'Verifica que:\n';
                errorMessage += '• La ubicación esté activada\n';
                errorMessage += '• Tengas conexión a internet\n';
                errorMessage += '• El navegador tenga permisos';
        }
        
        // Cerrar el modal actual y mostrar el error
        const currentModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
        if (currentModal) {
            currentModal.hide();
        }
        
        setTimeout(() => {
            showAlert(errorMessage);
        }, 300);
    }, options);
}

// --- Funciones de Tema ---
function toggleTheme() {
    const previousTheme = currentTheme;
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    applyTheme();
    updateThemeIcon();
    
    // Mostrar notificación del cambio de tema
    const themeName = currentTheme === 'dark' ? 'oscuro' : 'claro';
    //showAlert(`Tema cambiado a modo ${themeName}`);
}

function applyTheme() {
    const html = document.documentElement;
    if (currentTheme === 'dark') {
        html.setAttribute('data-theme', 'dark');
    } else {
        html.removeAttribute('data-theme');
    }
}

function updateThemeIcon() {
    const themeIcon = document.getElementById('theme-icon');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (currentTheme === 'dark') {
        themeIcon.className = 'bi bi-moon-fill';
        themeToggle.title = 'Cambiar a modo claro';
    } else {
        themeIcon.className = 'bi bi-sun-fill';
        themeToggle.title = 'Cambiar a modo oscuro';
    }
}

function initializeTheme() {
    // Detectar preferencia del sistema si no hay tema guardado
    if (!localStorage.getItem('theme')) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        currentTheme = prefersDark ? 'dark' : 'light';
        localStorage.setItem('theme', currentTheme);
    }
    
    applyTheme();
    updateThemeIcon();
    
    // Escuchar cambios en la preferencia del sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            currentTheme = e.matches ? 'dark' : 'light';
            applyTheme();
            updateThemeIcon();
        }
    });
}

// Función para forzar el cierre de modales bloqueados
function forceCloseModals() {
    // Cerrar todos los modales abiertos
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            modalInstance.hide();
        }
    });
    
    // Remover clases de backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Restaurar scroll del body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '';
    
    // Habilitar interacciones
    document.body.style.pointerEvents = 'auto';
}

// --- Funciones de Navegación Táctil para Tablas ---
// ELIMINAR ESTA FUNCIÓN COMPLETAMENTE - Usar comportamiento por defecto
// function initializeTableNavigation() {
//     // Esta función se elimina para usar el comportamiento por defecto de las tablas
// }

// --- Funcionalidad Scroll to Top ---
function initializeScrollToTop() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    
    if (!scrollToTopBtn) return;
    
    // Función para mostrar/ocultar el botón
    function toggleScrollButton() {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }
    }
    
    // Función para hacer scroll hacia arriba
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    // Event listeners
    window.addEventListener('scroll', toggleScrollButton);
    scrollToTopBtn.addEventListener('click', scrollToTop);
    
    // También mostrar el botón si la página ya está scrolleada al cargar
    if (window.pageYOffset > 300) {
        scrollToTopBtn.classList.add('show');
    }
}

// Función para filtrar servicios del técnico por estado
function filterEmployeeServices(status) {
    currentEmployeeServicesFilter = status;
    
    // Actualizar botones activos
    const filterButtons = document.querySelectorAll('.employee-filters .btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.trim() === status || (status === 'todos' && btn.textContent.trim() === 'Todos')) {
            btn.classList.add('active');
        }
    });
    
    // Re-renderizar la lista con el filtro aplicado
    renderEmployeeAssignedServices(1);
}