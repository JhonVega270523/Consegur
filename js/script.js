// Global variables for managing state and data
let currentUser = null;

// Función para cargar datos de manera segura
function loadDataSafely(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                return parsed;
            } else {
                console.warn(`⚠️ ${key} no es un array, usando valor por defecto`);
                return defaultValue;
            }
        }
        return defaultValue;
    } catch (error) {
        console.error(`❌ Error al cargar ${key}:`, error);
        return defaultValue;
    }
}

// Cargar datos de manera segura
let users = loadDataSafely('users', []);
let services = loadDataSafely('services', []);
let reports = loadDataSafely('reports', []);
let notifications = loadDataSafely('notifications', []);
let costoServicios = loadDataSafely('costoServicios', []);
let remisiones = loadDataSafely('remisiones', []);

console.log('📊 Datos cargados:', {
    users: users.length,
    services: services.length,
    reports: reports.length,
    notifications: notifications.length,
    costoServicios: costoServicios.length,
    remisiones: remisiones.length
});

// Debug: Verificar carga de datos de costo servicios
console.log('📊 Datos de costo servicios cargados:', costoServicios);
let currentTheme = localStorage.getItem('theme') || 'light'; // Tema actual
let currentEmployeeServicesFilter = 'todos'; // Filtro actual para servicios del técnico

// Contadores para IDs únicos
let serviceCounter = parseInt(localStorage.getItem('serviceCounter')) || 0;
let reportCounter = parseInt(localStorage.getItem('reportCounter')) || 0;
let remisionCounter = parseInt(localStorage.getItem('remisionCounter')) || 0;

// Sistema de debugging para IDs
let debugMode = true; // Cambiar a false en producción

function debugLog(message, data = null) {
    if (debugMode) {
        console.log(`[DEBUG] ${message}`, data || '');
    }
}

// Crear usuario administrador por defecto si no hay usuarios
if (users.length === 0) {
    users = [
        {
            id: generateId(),
            username: 'admin',
            password: '12345',
            role: 'admin'
        }
    ];
    localStorage.setItem('users', JSON.stringify(users));
    console.log('Usuario administrador por defecto creado:', users[0]);
}

// Crear algunos servicios de costo por defecto si no existen
if (costoServicios.length === 0) {
    costoServicios = [
        {
            id: generateId(),
            codigo: 'CS001',
            tipo: 'Bovedas y cajas fuertes de seguridad',
            descripcion: 'Instalación de caja fuerte residencial',
            precio: 150000
        },
        {
            id: generateId(),
            codigo: 'CS002',
            tipo: 'Puertas de seguridad',
            descripcion: 'Instalación de puerta blindada',
            precio: 250000
        },
        {
            id: generateId(),
            codigo: 'CS003',
            tipo: 'Pasatulas o tombolas',
            descripcion: 'Mantenimiento de cerradura electrónica',
            precio: 80000
        }
    ];
    localStorage.setItem('costoServicios', JSON.stringify(costoServicios));
    console.log('Servicios de costo por defecto creados:', costoServicios);
}

// Migrar servicios existentes al nuevo formato de IDs
function migrateExistingIds() {
    let needsMigration = false;
    
    // Migrar servicios
    services.forEach(service => {
        if (!service.id.startsWith('S')) {
            const oldId = service.id;
            service.id = generateServiceId();
            needsMigration = true;
            debugLog(`Servicio migrado: ${oldId} → ${service.id}`);
        }
    });
    
    // Migrar reportes
    reports.forEach(report => {
        if (!report.id.startsWith('R')) {
            const oldId = report.id;
            report.id = generateReportId();
            needsMigration = true;
            debugLog(`Reporte migrado: ${oldId} → ${report.id}`);
        }
    });
    
    if (needsMigration) {
        saveServices();
        saveReports();
        debugLog('IDs migrados al nuevo formato');
    }
}

// Inicializar contadores basándose en datos existentes
function initializeCounters() {
    // Migrar IDs existentes primero
    migrateExistingIds();
    
    // Inicializar contador de servicios
    if (services.length > 0) {
        const serviceIds = services.map(s => s.id).filter(id => id.startsWith('S'));
        if (serviceIds.length > 0) {
            const maxServiceNumber = Math.max(...serviceIds.map(id => {
                const match = id.match(/^S(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            serviceCounter = Math.max(serviceCounter, maxServiceNumber);
            debugLog(`Contador de servicios inicializado: ${serviceCounter}`);
        }
    }
    
    // Inicializar contador de reportes
    if (reports.length > 0) {
        const reportIds = reports.map(r => r.id).filter(id => id.startsWith('R'));
        if (reportIds.length > 0) {
            const maxReportNumber = Math.max(...reportIds.map(id => {
                const match = id.match(/^R(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            reportCounter = Math.max(reportCounter, maxReportNumber);
            debugLog(`Contador de reportes inicializado: ${reportCounter}`);
        }
    }
    
    // Guardar contadores actualizados
    localStorage.setItem('serviceCounter', serviceCounter.toString());
    localStorage.setItem('reportCounter', reportCounter.toString());
}

// Ejecutar inicialización de contadores
initializeCounters();

// Forzar migración y reinicio de contadores si es necesario
function forceMigrationAndReset() {
    debugLog('Forzando migración y reinicio de contadores...');
    
    // Migrar todos los servicios que no tengan formato S001
    let servicesMigrated = false;
    services.forEach(service => {
        if (!service.id.startsWith('S')) {
            const oldId = service.id;
            service.id = generateServiceId();
            servicesMigrated = true;
            debugLog(`Servicio migrado: ${oldId} → ${service.id}`);
        }
    });
    
    // Migrar todos los reportes que no tengan formato R001
    let reportsMigrated = false;
    reports.forEach(report => {
        if (!report.id.startsWith('R')) {
            const oldId = report.id;
            report.id = generateReportId();
            reportsMigrated = true;
            debugLog(`Reporte migrado: ${oldId} → ${report.id}`);
        }
    });
    
    if (servicesMigrated || reportsMigrated) {
        saveServices();
        saveReports();
        debugLog('Migración forzada completada');
    }
    
    // Reiniciar contadores basándose en los datos migrados
    if (services.length > 0) {
        const serviceIds = services.map(s => s.id).filter(id => id.startsWith('S'));
        if (serviceIds.length > 0) {
            const maxServiceNumber = Math.max(...serviceIds.map(id => {
                const match = id.match(/^S(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            serviceCounter = maxServiceNumber;
            debugLog(`Contador de servicios reiniciado: ${serviceCounter}`);
        }
    }
    
    if (reports.length > 0) {
        const reportIds = reports.map(r => r.id).filter(id => id.startsWith('R'));
        if (reportIds.length > 0) {
            const maxReportNumber = Math.max(...reportIds.map(id => {
                const match = id.match(/^R(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            reportCounter = maxReportNumber;
            debugLog(`Contador de reportes reiniciado: ${reportCounter}`);
        }
    }
    
    localStorage.setItem('serviceCounter', serviceCounter.toString());
    localStorage.setItem('reportCounter', reportCounter.toString());
}

// Ejecutar migración forzada
forceMigrationAndReset();

// Verificar y corregir IDs existentes
function ensureCorrectIds() {
    debugLog('Verificando y corrigiendo IDs...');
    
    // Recargar datos del localStorage
    services = JSON.parse(localStorage.getItem('services')) || [];
    reports = JSON.parse(localStorage.getItem('reports')) || [];
    
    let needsUpdate = false;
    
    // Verificar servicios
    services.forEach(service => {
        if (!service.id || !service.id.startsWith('S') || !/^S\d{3}$/.test(service.id)) {
            const oldId = service.id;
            service.id = generateServiceId();
            needsUpdate = true;
            debugLog(`Servicio corregido: ${oldId} → ${service.id}`);
        }
    });
    
    // Verificar reportes
    reports.forEach(report => {
        if (!report.id || !report.id.startsWith('R') || !/^R\d{3}$/.test(report.id)) {
            const oldId = report.id;
            report.id = generateReportId();
            needsUpdate = true;
            debugLog(`Reporte corregido: ${oldId} → ${report.id}`);
        }
    });
    
    if (needsUpdate) {
        saveServices();
        saveReports();
        debugLog('IDs corregidos y guardados');
    }
    
    // Actualizar contadores basándose en los datos corregidos
    if (services.length > 0) {
        const serviceIds = services.map(s => s.id).filter(id => id.startsWith('S'));
        if (serviceIds.length > 0) {
            const maxServiceNumber = Math.max(...serviceIds.map(id => {
                const match = id.match(/^S(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            serviceCounter = Math.max(serviceCounter, maxServiceNumber);
            debugLog(`Contador de servicios actualizado: ${serviceCounter}`);
        }
    }
    
    if (reports.length > 0) {
        const reportIds = reports.map(r => r.id).filter(id => id.startsWith('R'));
        if (reportIds.length > 0) {
            const maxReportNumber = Math.max(...reportIds.map(id => {
                const match = id.match(/^R(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            reportCounter = Math.max(reportCounter, maxReportNumber);
            debugLog(`Contador de reportes actualizado: ${reportCounter}`);
        }
    }
    
    localStorage.setItem('serviceCounter', serviceCounter.toString());
    localStorage.setItem('reportCounter', reportCounter.toString());
}

// Validar y corregir IDs antes de crear nuevos elementos
function validateAndCorrectIds() {
    debugLog('Validando IDs antes de crear nuevos elementos...');
    
    // Sincronizar contadores con localStorage
    const currentServiceCounter = parseInt(localStorage.getItem('serviceCounter')) || 0;
    const currentReportCounter = parseInt(localStorage.getItem('reportCounter')) || 0;
    
    if (currentServiceCounter !== serviceCounter) {
        serviceCounter = currentServiceCounter;
        debugLog(`Contador de servicios sincronizado: ${serviceCounter}`);
    }
    
    if (currentReportCounter !== reportCounter) {
        reportCounter = currentReportCounter;
        debugLog(`Contador de reportes sincronizado: ${reportCounter}`);
    }
    
    // Verificar que no haya IDs duplicados o incorrectos
    const serviceIds = services.map(s => s.id);
    const reportIds = reports.map(r => r.id);
    
    const duplicateServiceIds = serviceIds.filter((id, index) => serviceIds.indexOf(id) !== index);
    const duplicateReportIds = reportIds.filter((id, index) => reportIds.indexOf(id) !== index);
    
    if (duplicateServiceIds.length > 0) {
        debugLog(`IDs de servicios duplicados detectados: ${duplicateServiceIds.join(', ')}`);
    }
    
    if (duplicateReportIds.length > 0) {
        debugLog(`IDs de reportes duplicados detectados: ${duplicateReportIds.join(', ')}`);
    }
    
    // Verificar formato de IDs
    const invalidServiceIds = serviceIds.filter(id => !/^S\d{3}$/.test(id));
    const invalidReportIds = reportIds.filter(id => !/^R\d{3}$/.test(id));
    
    if (invalidServiceIds.length > 0) {
        debugLog(`IDs de servicios con formato incorrecto: ${invalidServiceIds.join(', ')}`);
    }
    
    if (invalidReportIds.length > 0) {
        debugLog(`IDs de reportes con formato incorrecto: ${invalidReportIds.join(', ')}`);
    }
}

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    debugLog('DOM cargado, verificando IDs...');
    ensureCorrectIds();
});

// También ejecutar inmediatamente
ensureCorrectIds();

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

// Función para generar ID único de servicio (S001, S002, etc.)
function generateServiceId() {
    serviceCounter++;
    localStorage.setItem('serviceCounter', serviceCounter.toString());
    return 'S' + serviceCounter.toString().padStart(3, '0');
}

// Función para generar ID único de reporte (R001, R002, etc.)
function generateReportId() {
    reportCounter++;
    localStorage.setItem('reportCounter', reportCounter.toString());
    return 'R' + reportCounter.toString().padStart(3, '0');
}

// Función para generar ID único de remisión (RM001, RM002, etc.)
function generateRemisionId() {
    remisionCounter++;
    localStorage.setItem('remisionCounter', remisionCounter.toString());
    return 'RM' + remisionCounter.toString().padStart(3, '0');
}

// Función para generar códigos de servicio incrementales (CS001, CS002, etc.)
function generateCostoServicioCode() {
    // Obtener el último código existente
    const existingCodes = costoServicios.map(s => s.codigo);
    const numericCodes = existingCodes
        .filter(code => code && code.startsWith('CS'))
        .map(code => {
            const numPart = code.substring(2);
            return parseInt(numPart) || 0;
        });
    
    // Encontrar el siguiente número
    const nextNumber = numericCodes.length > 0 ? Math.max(...numericCodes) + 1 : 1;
    
    // Formatear como CS001, CS002, etc.
    return 'CS' + String(nextNumber).padStart(3, '0');
}

// Función para mostrar/ocultar el campo de tipo personalizado
function toggleOtroTipo() {
    const tipoSelect = document.getElementById('costo-servicio-tipo');
    const otroContainer = document.getElementById('otro-tipo-container');
    const otroInput = document.getElementById('costo-servicio-otro-tipo');
    
    if (tipoSelect.value === 'Otro') {
        otroContainer.classList.remove('d-none');
        otroInput.required = true;
        otroInput.focus();
    } else {
        otroContainer.classList.add('d-none');
        otroInput.required = false;
        otroInput.value = '';
    }
}

// Función de prueba para verificar datos de costo servicios
function testCostoServiciosData() {
    console.log('🧪 Prueba de datos de costo servicios:');
    console.log('📊 Variable costoServicios:', costoServicios);
    console.log('💾 localStorage costoServicios:', JSON.parse(localStorage.getItem('costoServicios') || '[]'));
    console.log('🔍 Elementos del DOM:');
    console.log('- edit-costo-servicio-id:', document.getElementById('edit-costo-servicio-id'));
    console.log('- costo-servicio-codigo:', document.getElementById('costo-servicio-codigo'));
    console.log('- costo-servicio-tipo:', document.getElementById('costo-servicio-tipo'));
    console.log('- costo-servicio-descripcion:', document.getElementById('costo-servicio-descripcion'));
    console.log('- costo-servicio-precio:', document.getElementById('costo-servicio-precio'));
    console.log('- createCostoServicioModal:', document.getElementById('createCostoServicioModal'));
}

// Función para forzar la carga de datos en el modal de costo servicios
function forceLoadDataInModal(servicio) {
    console.log('🔄 Forzando carga de datos en modal de costo servicios:', servicio);
    
    // Cargar datos directamente
    document.getElementById('edit-costo-servicio-id').value = servicio.id;
    document.getElementById('costo-servicio-codigo').value = servicio.codigo || '';
    document.getElementById('costo-servicio-descripcion').value = servicio.descripcion || '';
    document.getElementById('costo-servicio-precio').value = servicio.precio || '';
    
    // Configurar el campo de código como solo lectura
    document.getElementById('costo-servicio-codigo').readOnly = true;
    document.getElementById('costo-servicio-codigo').style.backgroundColor = '#f8f9fa';
    
    // Manejar el tipo de servicio
    const tipoSelect = document.getElementById('costo-servicio-tipo');
    const otroInput = document.getElementById('costo-servicio-otro-tipo');
    const otroContainer = document.getElementById('otro-tipo-container');
    
    const opcionesPredefinidas = [
        'Bovedas y cajas fuertes de seguridad',
        'Puertas de seguridad',
        'Pasatulas o tombolas'
    ];
    
    if (opcionesPredefinidas.includes(servicio.tipo)) {
        tipoSelect.value = servicio.tipo;
        if (otroContainer) otroContainer.classList.add('d-none');
        if (otroInput) otroInput.value = '';
    } else {
        tipoSelect.value = 'Otro';
        if (otroContainer) otroContainer.classList.remove('d-none');
        if (otroInput) otroInput.value = servicio.tipo || '';
    }
    
    console.log('✅ Datos forzados en modal de costo servicios');
}

// Función para forzar la carga de datos en el modal de servicios
function forceLoadServiceDataInModal(service) {
    console.log('🔄 Forzando carga de datos en modal de servicios:', service);
    
    try {
        // Cargar datos básicos del servicio
        document.getElementById('edit-service-id').value = service.id;
        document.getElementById('service-date').value = service.date;
        document.getElementById('service-time').value = service.serviceTime || '';
        document.getElementById('service-code').value = service.serviceCode || '';
        document.getElementById('service-type').value = service.safeType || '';
        document.getElementById('service-description').value = service.description || '';
        document.getElementById('service-location').value = service.location || '';
        document.getElementById('service-client-name').value = service.clientName || '';
        document.getElementById('service-client-phone').value = service.clientPhone || '';
        document.getElementById('service-status').value = service.status;
        
        console.log('📝 Datos básicos cargados:', {
            id: service.id,
            date: service.date,
            serviceCode: service.serviceCode,
            safeType: service.safeType,
            description: service.description,
            location: service.location,
            clientName: service.clientName,
            clientPhone: service.clientPhone,
            status: service.status
        });
        
        // Manejar el campo de técnico
        const technicianField = document.getElementById('service-technician-field');
        if (service.technicianId || currentUser.role === 'admin') {
            technicianField.classList.remove('d-none');
            document.getElementById('service-technician').value = service.technicianId || '';
        } else {
            technicianField.classList.add('d-none');
            document.getElementById('service-technician').value = '';
        }
        
        // Configurar secciones de foto y firmas
        togglePhotoAndSignatureSections(service.status, currentUser.role === 'employee');
        
        // Cargar foto si existe
        if (service.photo) {
            document.getElementById('service-photo-preview').src = service.photo;
            document.getElementById('service-photo-preview').classList.remove('d-none');
        } else {
            document.getElementById('service-photo-preview').classList.add('d-none');
        }
        
        // Cargar firma del cliente si existe
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
        
        // Cargar firma del técnico si existe
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
        
        // Cargar detalles del servicio
        loadServiceDetails();
        
        // Cargar servicios adicionales si existen
        loadAdditionalServicesInModal(service);
        
        console.log('✅ Datos forzados en modal de servicios');
        
    } catch (error) {
        console.error('❌ Error al cargar datos del servicio en el modal:', error);
    }
}

// Save data to localStorage
function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function saveServices() {
    try {
        console.log('🔄 Guardando servicios en localStorage...');
        console.log('📊 Número de servicios a guardar:', services.length);
        
        // Verificar que services sea un array válido
        if (!Array.isArray(services)) {
            console.error('❌ services no es un array válido:', services);
            throw new Error('Datos de servicios inválidos');
        }
        
        // Verificar que localStorage esté disponible
        if (typeof localStorage === 'undefined') {
            console.error('❌ localStorage no está disponible');
            throw new Error('Almacenamiento local no disponible');
        }
        
        const servicesJson = JSON.stringify(services);
        console.log('📝 JSON generado, tamaño:', servicesJson.length, 'caracteres');
        
        localStorage.setItem('services', servicesJson);
        console.log('✅ Servicios guardados exitosamente en localStorage');
        
        // Verificar que se guardó correctamente
        const savedData = localStorage.getItem('services');
        if (!savedData) {
            throw new Error('Los datos no se guardaron correctamente');
        }
        
        console.log('✅ Verificación: datos guardados correctamente');
        
    } catch (error) {
        console.error('❌ Error al guardar servicios:', error);
        console.error('🔍 Tipo de error:', error.name);
        console.error('🔍 Mensaje de error:', error.message);
        
        // Si es un error de quota, dar un mensaje más específico
        if (error.name === 'QuotaExceededError') {
            throw new Error('Espacio de almacenamiento insuficiente. Por favor, elimine algunos datos o use otro navegador.');
        }
        
        throw new Error('Error al guardar los servicios. Por favor, intente nuevamente.');
    }
}

function saveReports() {
    localStorage.setItem('reports', JSON.stringify(reports));
}

function saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

function saveCostoServicios() {
    localStorage.setItem('costoServicios', JSON.stringify(costoServicios));
}

function saveRemisiones() {
    localStorage.setItem('remisiones', JSON.stringify(remisiones));
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
        fixExistingServices(); // Corregir servicios existentes
        renderAdminServicesList(services, 1);
        populateAssignServiceDropdown();
        populateAssignTechnicianDropdown();
        populateTechnicianDropdowns();
        renderAssignedServicesList(1);
        renderReportsList(1);
        
        // Forzar actualización de notificaciones
        console.log('🔄 Cargando notificaciones de administrador...');
        renderAdminNotifications(1);
        updateNotificationBadges(); // Update badges for admin
        
        // Inicializar nuevos módulos
        initializeAdminModules();
        
        // Limpiar todos los filtros al entrar al módulo de servicios
        clearFilters();
        
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
        updateEmployeeFilterCounts(); // Actualizar contadores de filtros
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
    const userCardsElement = document.getElementById('user-list-cards');
    const userTable = userListElement.closest('table');
    const userTableHeader = userTable.querySelector('thead');
    
    // Agregar encabezado de numeración si no existe
    if (!userTableHeader.querySelector('th:first-child').innerHTML.includes('bi-hash')) {
        addNumberHeader(userTableHeader);
    }
    
    userListElement.innerHTML = '';
    userCardsElement.innerHTML = '';
    
    const totalPages = getTotalPages(users.length);
    const paginatedUsers = paginateArray(users, page);
    
    if (paginatedUsers.length === 0) {
        // Mensaje para tabla
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="4" class="text-center text-muted py-4">
                <i class="bi bi-people" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay usuarios registrados</strong>
            </td>
        `;
        userListElement.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-people" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No hay usuarios registrados</strong>
        `;
        userCardsElement.appendChild(noResultsCard);
    } else {
        paginatedUsers.forEach(user => {
            // Generar fila de tabla (vista desktop)
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
            
            // Generar tarjeta móvil (vista móvil)
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            
            const roleClass = user.role === 'admin' ? 'admin' : 'technician';
            const roleText = user.role === 'admin' ? 'Administrador' : 'Técnico';
            
            userCard.innerHTML = `
                <div class="user-card-header">
                    <span class="user-card-username">${user.username}</span>
                    <span class="user-card-role ${roleClass}">${roleText}</span>
                </div>
                <div class="user-card-actions">
                    <button class="btn btn-warning btn-sm" onclick="editUser('${user.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}')">Eliminar</button>
                </div>
            `;
            userCardsElement.appendChild(userCard);
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
    const technicianSelects = document.querySelectorAll('#service-technician, #assign-technician');
    technicianSelects.forEach(select => {
        select.innerHTML = '<option value="">Seleccionar técnico...</option>';
        users.filter(user => user.role === 'employee').forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username;
            select.appendChild(option);
        });
    });
}

// Función para limpiar completamente el formulario de servicios
function clearServiceForm() {
    console.log('🧹 Limpiando formulario de servicios...');
    
    // Limpiar todos los campos del formulario
    const form = document.getElementById('service-form');
    if (form) {
        form.reset();
    }
    
    // Limpiar campos específicos
    const fields = [
        'service-date',
        'service-time',
        'service-code',
        'service-type',
        'service-description',
        'service-location',
        'service-client-name',
        'service-client-phone',
        'service-status',
        'edit-service-id',
        'service-photo'
    ];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (field.tagName === 'SELECT') {
                field.value = '';
                field.disabled = false;
                field.style.backgroundColor = '';
            } else {
                field.value = '';
            }
        }
    });
    
    // Limpiar firmas
    clearSignaturePad('client');
    clearSignaturePad('technician');
    
    // Limpiar foto
    const photoPreview = document.getElementById('service-photo-preview');
    if (photoPreview) {
        photoPreview.classList.add('d-none');
        photoPreview.src = '';
    }
    
    // Limpiar servicios adicionales
    const additionalServicesContainer = document.getElementById('additional-services-container');
    if (additionalServicesContainer) {
        additionalServicesContainer.innerHTML = '';
    }
    
    console.log('✅ Formulario de servicios limpiado completamente');
}

// Función para cargar los códigos de servicio en el dropdown
function populateServiceCodes() {
    console.log('=== populateServiceCodes llamado ===');
    console.log('costoServicios disponibles:', costoServicios);
    
    const serviceCodeSelect = document.getElementById('service-code');
    if (serviceCodeSelect) {
        // Asegurar que el dropdown esté habilitado
        serviceCodeSelect.disabled = false;
        serviceCodeSelect.style.backgroundColor = '';
        
        serviceCodeSelect.innerHTML = '<option value="">Seleccionar código de servicio...</option>';
        costoServicios.forEach(servicio => {
            const option = document.createElement('option');
            option.value = servicio.codigo;
            option.textContent = `${servicio.codigo} - ${servicio.descripcion}`;
            serviceCodeSelect.appendChild(option);
            console.log('Agregada opción:', servicio.codigo, '-', servicio.descripcion);
        });
        console.log('✅ Dropdown de códigos de servicio poblado correctamente');
    } else {
        console.log('❌ No se encontró el elemento service-code');
    }
    console.log('=== Fin populateServiceCodes ===');
}

// Función para cargar los detalles del servicio seleccionado
function loadServiceDetails() {
    const serviceCode = document.getElementById('service-code').value;
    const serviceType = document.getElementById('service-type');
    const serviceDescription = document.getElementById('service-description');
    
    console.log('=== loadServiceDetails llamado ===');
    console.log('Código seleccionado:', serviceCode);
    console.log('costoServicios disponibles:', costoServicios);
    
    if (serviceCode) {
        const servicio = costoServicios.find(s => s.codigo === serviceCode);
        console.log('Servicio encontrado en costoServicios:', servicio);
        
        if (servicio) {
            serviceType.value = servicio.tipo;
            serviceDescription.value = servicio.descripcion;
            console.log('✅ Campos actualizados en el formulario:');
            console.log('   Tipo de servicio:', servicio.tipo);
            console.log('   Descripción:', servicio.descripcion);
            console.log('   Valor en campo tipo:', serviceType.value);
            console.log('   Valor en campo descripción:', serviceDescription.value);
        } else {
            console.log('❌ No se encontró servicio con código:', serviceCode);
            serviceType.value = '';
            serviceDescription.value = '';
        }
    } else {
        serviceType.value = '';
        serviceDescription.value = '';
        console.log('Código de servicio vacío, campos limpiados');
    }
    console.log('=== Fin loadServiceDetails ===');
}

// Función para agregar un servicio adicional
function addAdditionalService() {
    const container = document.getElementById('additional-services-container');
    const serviceId = Date.now(); // ID único para el servicio adicional
    
    const serviceDiv = document.createElement('div');
    serviceDiv.className = 'additional-service-item border rounded p-3 mb-2';
    serviceDiv.id = `additional-service-${serviceId}`;
    
    serviceDiv.innerHTML = `
        <div class="row">
            <div class="col-md-6 mb-2">
                <label class="form-label">Código de Servicio Adicional</label>
                <select class="form-select additional-service-code" onchange="loadAdditionalServiceDetails(${serviceId})">
                    <option value="">Seleccionar código de servicio...</option>
                    ${costoServicios.map(servicio => 
                        `<option value="${servicio.codigo}">${servicio.codigo} - ${servicio.tipo}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="col-md-6 mb-2">
                <label class="form-label">Tipo de Servicio</label>
                <input type="text" class="form-control additional-service-type" readonly>
            </div>
        </div>
        <div class="row">
            <div class="col-md-8 mb-2">
                <label class="form-label">Descripción</label>
                <input type="text" class="form-control additional-service-description" readonly>
            </div>
            <div class="col-md-4 mb-2 d-flex align-items-end">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeAdditionalService(${serviceId})">
                    <i class="bi bi-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(serviceDiv);
    console.log(`✅ Servicio adicional agregado con ID: ${serviceId}`);
}

// Función para cargar los detalles de un servicio adicional
function loadAdditionalServiceDetails(serviceId) {
    const serviceDiv = document.getElementById(`additional-service-${serviceId}`);
    const serviceCodeSelect = serviceDiv.querySelector('.additional-service-code');
    const serviceTypeInput = serviceDiv.querySelector('.additional-service-type');
    const serviceDescriptionInput = serviceDiv.querySelector('.additional-service-description');
    
    const serviceCode = serviceCodeSelect.value;
    
    if (serviceCode) {
        const servicio = costoServicios.find(s => s.codigo === serviceCode);
        if (servicio) {
            serviceTypeInput.value = servicio.tipo;
            serviceDescriptionInput.value = servicio.descripcion;
            console.log(`✅ Detalles del servicio adicional ${serviceId} cargados:`, servicio);
        } else {
            serviceTypeInput.value = '';
            serviceDescriptionInput.value = '';
            console.log(`❌ No se encontró servicio adicional con código: ${serviceCode}`);
        }
    } else {
        serviceTypeInput.value = '';
        serviceDescriptionInput.value = '';
    }
}

// Función para eliminar un servicio adicional
function removeAdditionalService(serviceId) {
    const serviceDiv = document.getElementById(`additional-service-${serviceId}`);
    if (serviceDiv) {
        serviceDiv.remove();
        console.log(`✅ Servicio adicional ${serviceId} eliminado`);
    }
}

// Función para cargar servicios adicionales en el modal de edición
function loadAdditionalServicesInModal(service) {
    console.log('🔄 Cargando servicios adicionales en modal:', service.additionalServices);
    
    // Limpiar contenedor de servicios adicionales
    const container = document.getElementById('additional-services-container');
    container.innerHTML = '';
    
    // Si el servicio tiene servicios adicionales, cargarlos
    if (service.additionalServices && Array.isArray(service.additionalServices) && service.additionalServices.length > 0) {
        service.additionalServices.forEach((additionalService, index) => {
            const serviceId = Date.now() + index; // ID único para cada servicio adicional
            
            const serviceDiv = document.createElement('div');
            serviceDiv.className = 'additional-service-item border rounded p-3 mb-2';
            serviceDiv.id = `additional-service-${serviceId}`;
            
            serviceDiv.innerHTML = `
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <label class="form-label">Código de Servicio Adicional</label>
                        <select class="form-select additional-service-code" onchange="loadAdditionalServiceDetails(${serviceId})">
                            <option value="">Seleccionar código de servicio...</option>
                            ${costoServicios.map(servicio => 
                                `<option value="${servicio.codigo}" ${servicio.codigo === additionalService.codigo ? 'selected' : ''}>${servicio.codigo} - ${servicio.tipo}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-2">
                        <label class="form-label">Tipo de Servicio</label>
                        <input type="text" class="form-control additional-service-type" value="${additionalService.tipo || ''}" readonly>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-8 mb-2">
                        <label class="form-label">Descripción</label>
                        <input type="text" class="form-control additional-service-description" value="${additionalService.descripcion || ''}" readonly>
                    </div>
                    <div class="col-md-4 mb-2 d-flex align-items-end">
                        <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeAdditionalService(${serviceId})">
                            <i class="bi bi-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(serviceDiv);
            console.log(`✅ Servicio adicional ${index + 1} cargado en modal`);
        });
    }
    
    console.log('✅ Servicios adicionales cargados en modal');
}

// Función para obtener todos los servicios adicionales del formulario
function getAdditionalServices() {
    const additionalServices = [];
    const serviceItems = document.querySelectorAll('.additional-service-item');
    
    serviceItems.forEach(item => {
        const serviceCode = item.querySelector('.additional-service-code').value;
        const serviceType = item.querySelector('.additional-service-type').value;
        const serviceDescription = item.querySelector('.additional-service-description').value;
        
        if (serviceCode && serviceType && serviceDescription) {
            const servicio = costoServicios.find(s => s.codigo === serviceCode);
            if (servicio) {
                additionalServices.push({
                    codigo: serviceCode,
                    tipo: serviceType,
                    descripcion: serviceDescription,
                    precio: servicio.precio
                });
            }
        }
    });
    
    console.log('📋 Servicios adicionales encontrados:', additionalServices);
    return additionalServices;
}

// Función para corregir servicios existentes que no tienen safeType
function fixExistingServices() {
    console.log('=== Corrigiendo servicios existentes ===');
    let fixedCount = 0;
    
    services.forEach(service => {
        if (service.serviceCode && (!service.safeType || service.safeType === 'No definido')) {
            const servicio = costoServicios.find(s => s.codigo === service.serviceCode);
            if (servicio) {
                service.safeType = servicio.tipo;
                service.description = servicio.descripcion;
                fixedCount++;
                console.log(`✅ Servicio ${service.id} corregido:`, {
                    codigo: service.serviceCode,
                    tipo: service.safeType,
                    descripcion: service.description
                });
            }
        }
    });
    
    if (fixedCount > 0) {
        saveServices();
        console.log(`✅ ${fixedCount} servicios corregidos y guardados`);
    } else {
        console.log('✅ No se encontraron servicios que necesiten corrección');
    }
    
    console.log('=== Fin corrección de servicios ===');
}


function renderAdminServicesList(filteredServices = services, page = 1) {
    currentAdminServicesPage = page;
    currentAdminServicesData = filteredServices;
    
    const servicesListElement = document.getElementById('services-list-admin');
    const servicesCardsElement = document.getElementById('services-list-admin-cards');
    const servicesTable = servicesListElement.closest('table');
    const servicesTableHeader = servicesTable.querySelector('thead');
    
    // Agregar encabezado de numeración si no existe
    if (!servicesTableHeader.querySelector('th:first-child').innerHTML.includes('bi-hash')) {
        addNumberHeader(servicesTableHeader);
    }
    
    servicesListElement.innerHTML = '';
    servicesCardsElement.innerHTML = '';
    
    const totalPages = getTotalPages(filteredServices.length);
    const paginatedServices = paginateArray(filteredServices, page);
    
    if (paginatedServices.length === 0) {
        // Mensaje para tabla
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="11" class="text-center text-muted py-4">
                <i class="bi bi-search" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No se encontraron servicios</strong>
                <br>
                <small>Intenta ajustar los filtros de búsqueda</small>
            </td>
        `;
        servicesListElement.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-search" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No se encontraron servicios</strong>
            <br>
            <small>Intenta ajustar los filtros de búsqueda</small>
        `;
        servicesCardsElement.appendChild(noResultsCard);
    } else {
        paginatedServices.forEach(service => {
            const canEdit = !['Finalizado', 'Cancelado'].includes(service.status);
            const editButton = canEdit ?
                `<button class="btn btn-warning btn-sm" onclick="editService('${service.id}')">Editar</button>` :
                `<button class="btn btn-warning btn-sm" disabled title="No se puede editar servicio finalizado/cancelado">Editar</button>`;
            const deleteButton = canEdit ?
                `<button class="btn btn-danger btn-sm" onclick="deleteService('${service.id}')">Eliminar</button>` :
                `<button class="btn btn-danger btn-sm" disabled title="No se puede eliminar servicio finalizado/cancelado">Eliminar</button>`;

            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            console.log('=== Renderizando servicio ===');
            console.log('ID:', service.id);
            console.log('Fecha:', service.date);
            console.log('Cliente:', service.clientName);
            console.log('Código:', service.serviceCode);
            console.log('Tipo:', service.safeType);
            console.log('Descripción:', service.description);
            console.log('Ubicación:', service.location);
            console.log('Técnico:', service.technicianId);
            console.log('Estado:', service.status);
            console.log('==========================');
            
            row.innerHTML = `
                <td>${service.id}</td>
                <td>${service.date}</td>
                <td>${service.serviceTime || '-'}</td>
                <td>${service.clientName || '-'}</td>
                <td>${service.serviceCode || '-'}</td>
                <td>${service.safeType || 'No definido'}</td>
                <td>${service.description || '-'}</td>
                <td>${service.location || '-'}</td>
                <td>${getTechnicianNameById(service.technicianId) || 'No asignado'}</td>
                <td>${service.status || '-'}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')">Ver</button>
                    ${editButton}
                    ${deleteButton}
                </td>
            `;
            servicesListElement.appendChild(row);
            
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
            
            // Generar información de servicios adicionales para la tarjeta
            let additionalServicesInfo = '';
            if (service.additionalServices && Array.isArray(service.additionalServices) && service.additionalServices.length > 0) {
                const totalAdditionalPrice = service.additionalServices.reduce((sum, additionalService) => sum + (additionalService.precio || 0), 0);
                additionalServicesInfo = `
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Servicios Adicionales:</span>
                        <span class="service-card-info-value">${service.additionalServices.length} servicio(s) - $${totalAdditionalPrice.toLocaleString()}</span>
                    </div>
                `;
            }

            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${service.id}</span>
                    <span class="service-card-status ${statusClass}">${service.status}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha:</span>
                        <span class="service-card-info-value">${service.date}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Cliente:</span>
                        <span class="service-card-info-value">${service.clientName}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Tipo Servicio:</span>
                        <span class="service-card-info-value">${service.safeType}</span>
                    </div>
                    ${additionalServicesInfo}
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Ubicación:</span>
                        <span class="service-card-info-value">${service.location}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Técnico:</span>
                        <span class="service-card-info-value">${getTechnicianNameById(service.technicianId)}</span>
                    </div>
                </div>
                <div class="service-card-actions">
                    <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')">Ver</button>
                    ${editButton}
                    ${deleteButton}
                </div>
            `;
            servicesCardsElement.appendChild(serviceCard);
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
            const serviceId = service.id.toLowerCase();
            const serviceCode = (service.serviceCode || '').toLowerCase();
            const clientName = service.clientName.toLowerCase();
            const safeType = service.safeType.toLowerCase();
            const description = (service.description || '').toLowerCase();
            const technicianName = getTechnicianNameById(service.technicianId).toLowerCase();
            const status = service.status.toLowerCase();
            
            return serviceId.includes(searchTerm) ||
                   serviceCode.includes(searchTerm) ||
                   clientName.includes(searchTerm) ||
                   safeType.includes(searchTerm) ||
                   description.includes(searchTerm) ||
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

// Función para obtener los tipos de servicio seleccionados
function getSelectedServiceTypes() {
    const selectedTypes = [];
    const checkboxes = [
        document.getElementById('service-type-bovedas'),
        document.getElementById('service-type-puertas'),
        document.getElementById('service-type-pasatulas')
    ];
    
    checkboxes.forEach(checkbox => {
        if (checkbox && checkbox.checked) {
            selectedTypes.push(checkbox.value);
        }
    });
    
    return selectedTypes.join(', ');
}

// Función para establecer los tipos de servicio en los checkboxes
function setServiceTypes(typesString) {
    const types = typesString ? typesString.split(', ') : [];
    const checkboxes = {
        'Bovedas y cajas fuertes de seguridad': document.getElementById('service-type-bovedas'),
        'Puertas de seguridad': document.getElementById('service-type-puertas'),
        'Pasatulas o tombolas': document.getElementById('service-type-pasatulas')
    };
    
    // Limpiar todos los checkboxes
    Object.values(checkboxes).forEach(checkbox => {
        if (checkbox) checkbox.checked = false;
    });
    
    // Marcar los checkboxes correspondientes
    types.forEach(type => {
        if (checkboxes[type]) {
            checkboxes[type].checked = true;
        }
    });
}

// Event listener eliminado - se usa el listener correcto más abajo

function saveServiceData(serviceId, date, serviceTime, safeType, description, location, clientName, clientPhone, status, photoData) {
    console.log('=== saveServiceData llamado ===');
    console.log('serviceId:', serviceId);
    console.log('date:', date);
    console.log('safeType:', safeType);
    console.log('description:', description);
    console.log('location:', location);
    console.log('clientName:', clientName);
    console.log('clientPhone:', clientPhone);
    console.log('status:', status);
    console.log('currentUser.role:', currentUser?.role);
    console.log('photoData length:', photoData ? photoData.length : 0);
    console.log('==============================');
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
                saveServiceData(serviceId, date, serviceTime, safeType, description, location, clientName, clientPhone, status, photoData);
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
                timeout: 30000,           // Timeout de 30 segundos
                maximumAge: 0             // No usar ubicación en caché, obtener ubicación fresca
            };

            // Usar la instancia global de geolocalización
            if (!window.globalGeolocation) {
                window.globalGeolocation = new EnhancedGeolocation();
            }
            
            // Mostrar mensaje de carga
            showAlert('🌍 Obteniendo ubicación para finalizar servicio...\n\nPor favor espera mientras obtenemos tu ubicación GPS.');
            
            window.globalGeolocation.getQuickLocation(
                (locationData) => {
                    // Éxito: ubicación obtenida
                    finalizationOrCancellationTime = locationData.timestamp;
                    finalizationOrCancellationLocation = {
                        latitude: locationData.latitude,
                        longitude: locationData.longitude,
                        accuracy: locationData.accuracy,
                        timestamp: locationData.timestamp,
                        altitude: locationData.altitude,
                        heading: locationData.heading,
                        speed: locationData.speed,
                        altitudeAccuracy: locationData.altitudeAccuracy,
                        browser: locationData.browser,
                        deviceInfo: locationData.deviceInfo,
                        context: locationData.context
                    };
                    // Proceder a guardar una vez obtenida la ubicación
                    finalizeServiceSave();
                },
                (error) => {
                    // Error: mostrar mensaje específico
                    console.error('Error de geolocalización para finalización:', error);
                    showAlert(`❌ ${error.message}\n\n${error.details || ''}\n\n🔧 Soluciones:\n• Verifica que el GPS esté activado\n• Permite el acceso a la ubicación en tu navegador\n• Asegúrate de tener conexión a internet\n• Intenta en un área con mejor señal GPS`);
                },
                'finalizacion_servicio'
            );
        } else {
            finalizeServiceSave(); // Save directly if not finalization/cancellation by employee
        }

    function finalizeServiceSave() {
        // Validar y corregir IDs antes de crear nuevo servicio
        validateAndCorrectIds();
        
        // Obtener el serviceId del campo oculto
        const serviceId = document.getElementById('edit-service-id').value;
        
        // Debug: Verificar el valor de serviceId
        debugLog('Valor de serviceId antes de la asignación:', serviceId);
        debugLog('serviceId.trim() !== "":', serviceId && serviceId.trim() !== '');
        
        const generatedId = generateServiceId();
        debugLog('ID generado por generateServiceId():', generatedId);
        
        const finalId = serviceId && serviceId.trim() !== '' ? serviceId : generatedId;
        debugLog('ID final asignado al servicio:', finalId);
        
        console.log('=== Creando nuevo servicio ===');
        console.log('finalId:', finalId);
        console.log('date:', date);
        console.log('serviceCode:', document.getElementById('service-code').value);
        console.log('safeType:', safeType);
        console.log('description:', description);
        console.log('location:', location);
        console.log('clientName:', clientName);
        console.log('clientPhone:', clientPhone);
        console.log('status:', status);
        
        // Obtener servicios adicionales del formulario
        const additionalServices = getAdditionalServices();
        
        const newService = {
            id: finalId,
            date,
            serviceTime,
            serviceCode: document.getElementById('service-code').value,
            safeType,
            description,
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
            finalizationOrCancellationLocation: finalizationOrCancellationLocation,
            additionalServices: additionalServices // Agregar servicios adicionales
        };
        console.log('=== Servicio creado ===');
        console.log('newService completo:', newService);
        console.log('========================');

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
        
        
        
                // Intentar guardar el servicio
        let saveSuccessful = false;
        try {
            console.log('🔄 Intentando guardar servicio...');
            console.log('📊 Datos a guardar:', services);
            saveServices();
            console.log('✅ Servicio guardado exitosamente');
            saveSuccessful = true;
        } catch (error) {
            console.error('❌ Error al guardar servicio:', error);
            console.error('🔍 Detalles del error:', error.message, error.stack);
            
            // Verificar si es un problema de localStorage
            try {
                const testData = { test: 'data' };
                localStorage.setItem('test', JSON.stringify(testData));
                const retrieved = localStorage.getItem('test');
                localStorage.removeItem('test');
                console.log('✅ localStorage funciona correctamente');
            } catch (storageError) {
                console.error('❌ Problema con localStorage:', storageError);
                showAlert('❌ Error de almacenamiento. Verifique que el navegador tenga suficiente espacio y que no esté en modo privado.');
                return;
            }
            
            showAlert('❌ Error al guardar el servicio. Por favor, intente nuevamente.');
            return;
        }
        
        // Solo continuar si el guardado fue exitoso
        if (!saveSuccessful) {
            console.log('❌ No se pudo guardar el servicio, deteniendo proceso');
            return;
        }
        
        console.log('✅ Servicio guardado exitosamente, continuando con el proceso...');
        
        renderAdminServicesList(services, 1);
        populateAssignServiceDropdown();
        
        // Enviar notificación si el servicio se finalizó
        if (status === 'Finalizado' && currentUser.role === 'employee') {
            const notificationMessage = `El servicio ID: ${finalId} ha sido finalizado por el técnico ${currentUser.username}. Cliente: ${clientName}, Ubicación: ${location}`;
            console.log(`📨 Enviando notificación de finalización: ${notificationMessage}`);
            console.log(`👤 Técnico: ${currentUser.username}`);
            console.log(`🆔 ID del servicio: ${finalId}`);
            console.log(`👥 Usuarios disponibles:`, users.map(u => ({ id: u.id, username: u.username, role: u.role })));
            
            try {
                sendNotification('admin', notificationMessage);
                console.log('✅ Notificación enviada exitosamente');
            } catch (notificationError) {
                console.error('❌ Error al enviar notificación:', notificationError);
            }
        } else {
            console.log(`ℹ️ No se envía notificación - Status: ${status}, Role: ${currentUser?.role}`);
        }
        
        // Cerrar el modal después de guardar exitosamente de manera robusta
        console.log('🔒 Cerrando modal de registro de servicio...');
        const modalClosed = closeModalSafely('registerServiceModal');
        if (modalClosed) {
            console.log('✅ Modal cerrado exitosamente');
        } else {
            console.warn('⚠️ No se pudo cerrar el modal automáticamente');
        }
        
        document.getElementById('service-form').reset();
        clearSignaturePad('client');
        clearSignaturePad('technician');
        document.getElementById('service-photo-preview').classList.add('d-none');
        document.getElementById('edit-service-id').value = '';
        document.getElementById('service-photo').value = '';
        
        // Limpiar servicios adicionales
        document.getElementById('additional-services-container').innerHTML = '';
        
        // Limpiar explícitamente el campo de código de servicio
        const serviceCodeSelect = document.getElementById('service-code');
        if (serviceCodeSelect) {
            serviceCodeSelect.value = '';
            // Asegurar que el dropdown esté habilitado
            serviceCodeSelect.disabled = false;
            serviceCodeSelect.style.backgroundColor = '';
        }

        if (currentUser.role === 'employee') {
            console.log('🔄 Actualizando vista de servicios del técnico...');
            renderEmployeeAssignedServices(1);
            updateEmployeeFilterCounts(); // Actualizar contadores de filtros
            console.log('✅ Vista de servicios del técnico actualizada');
        } else if (currentUser.role === 'admin') {
            console.log('🔄 Actualizando vista de servicios del admin...');
            renderAdminServicesList(services, 1);
            console.log('✅ Vista de servicios del admin actualizada');
        }
        
        // Mostrar mensaje de éxito apropiado según el estado (solo para técnicos)
        if (currentUser.role === 'employee') {
            if (status === 'Finalizado') {
                if (finalizationOrCancellationLocation) {
                    if (!window.globalGeolocation) {
                        window.globalGeolocation = new EnhancedGeolocation();
                    }
                    const displayInfo = window.globalGeolocation.formatLocationForDisplay(finalizationOrCancellationLocation);
                    showAlert(`✅ Servicio finalizado exitosamente.\n\n📍 Ubicación registrada:\nCoordenadas: ${displayInfo.coordinates}\nPrecisión: ${displayInfo.accuracy}\nDirección: ${displayInfo.direction}\nVelocidad: ${displayInfo.speed}\nAltitud: ${displayInfo.altitude}\nNavegador: ${displayInfo.browser}\n\nEl servicio ha sido marcado como "Finalizado" y se ha registrado la ubicación de finalización.`);
                } else {
                    showAlert(`✅ Servicio finalizado exitosamente.\n\nEl servicio ha sido marcado como "Finalizado".`);
                }
            } else if (status === 'En proceso') {
                if (startLocation) {
                    if (!window.globalGeolocation) {
                        window.globalGeolocation = new EnhancedGeolocation();
                    }
                    const displayInfo = window.globalGeolocation.formatLocationForDisplay(startLocation);
                    showAlert(`✅ Servicio iniciado exitosamente.\n\n📍 Ubicación registrada:\nCoordenadas: ${displayInfo.coordinates}\nPrecisión: ${displayInfo.accuracy}\nDirección: ${displayInfo.direction}\nVelocidad: ${displayInfo.speed}\nAltitud: ${displayInfo.altitude}\nNavegador: ${displayInfo.browser}\n\nEl estado del servicio ha cambiado a "En proceso".`);
                } else {
                    showAlert(`✅ Servicio iniciado exitosamente.\n\nEl estado del servicio ha cambiado a "En proceso".`);
                }
            }
        }
    }
}

function editService(id) {
    console.log('🔍 Editando servicio con ID:', id);
    
    // Recargar datos desde localStorage para asegurar que estén actualizados
    services = JSON.parse(localStorage.getItem('services')) || [];
    console.log('📊 Datos recargados desde localStorage:', services);
    
    // Asegurar que services esté cargado
    if (!services || services.length === 0) {
        console.error('❌ No hay datos de servicios cargados');
        showAlert('Error: No hay datos de servicios disponibles');
        return;
    }
    
    const service = services.find(s => s.id === id);
    console.log('✅ Servicio encontrado:', service);
    
    if (service) {
        if (['Finalizado', 'Cancelado'].includes(service.status) && currentUser.role === 'admin') {
            // Allow admin to open, but most fields will be uneditable or should be visually distinct
            // For now, blocking full edit if status is fixed
            // showAlert('No se puede editar un servicio finalizado o cancelado directamente. Puedes ver los detalles.');
            // viewServiceDetails(id); // Show details instead
            // return;
        }
        
        // Cargar datos en el formulario ANTES de abrir el modal
        forceLoadServiceDataInModal(service);
        
        // Abrir el modal
        const modal = new bootstrap.Modal(document.getElementById('registerServiceModal'));
        modal.show();
        document.getElementById('registerServiceModalLabel').textContent = 'Editar Servicio';
        
        console.log('✅ Modal abierto con datos cargados');
        
    } else {
        console.error('❌ No se encontró el servicio con ID:', id);
        showAlert('Error: No se encontró el servicio a editar');
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
        // Generar HTML para servicios adicionales
        let additionalServicesHtml = '';
        if (service.additionalServices && Array.isArray(service.additionalServices) && service.additionalServices.length > 0) {
            additionalServicesHtml = `
                ${service.additionalServices.map((additionalService, index) => `
                    <div class="ms-3 mb-2">
                        <p><strong>Servicio Adicional ${index + 1}:</strong></p>
                        <p class="ms-3"><strong>Código:</strong> ${additionalService.codigo || '-'}</p>
                        <p class="ms-3"><strong>Tipo de Servicio:</strong> ${additionalService.tipo || '-'}</p>
                        <p class="ms-3"><strong>Descripción:</strong> ${additionalService.descripcion || '-'}</p>
                    </div>
                `).join('')}
            `;
        }

        const detailsHtml = `
            <p><strong>ID Servicio:</strong> ${service.id}</p>
            ${service.serviceCode ? `<p><strong>Código de Servicio:</strong> ${service.serviceCode}</p>` : ''}
            <p><strong>Fecha:</strong> ${service.date}</p>
            ${service.serviceTime ? `<p><strong>Hora de Servicio:</strong> ${service.serviceTime}</p>` : ''}
            <p><strong>Tipo de Servicio:</strong> ${service.safeType}</p>
            ${service.description ? `<p><strong>Descripción:</strong> ${service.description}</p>` : ''}
            ${additionalServicesHtml}
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

        const service = services[serviceIndex];
        const previousTechnicianId = service.technicianId;
        
        // Guardar información de asignación anterior para detectar reasignaciones
        if (!service.assignmentHistory) {
            service.assignmentHistory = [];
        }
        
        // Verificar si es una reasignación al mismo técnico
        const isReassignment = service.assignmentHistory.some(entry => 
            entry.technicianId === technicianId && entry.action === 'assigned'
        ) && service.assignmentHistory.some(entry => 
            entry.technicianId === technicianId && entry.action === 'unassigned'
        );
        
        // Si ya tenía un técnico asignado y es diferente, agregar desasignación a la historia
        if (previousTechnicianId && previousTechnicianId !== technicianId) {
            service.assignmentHistory.push({
                technicianId: previousTechnicianId,
                assignedAt: new Date().toISOString(),
                action: 'unassigned'
            });
        }
        
        // Actualizar el servicio
        service.technicianId = technicianId;
        service.status = 'Pendiente';
        
        // Agregar la nueva asignación a la historia
        service.assignmentHistory.push({
            technicianId: technicianId,
            assignedAt: new Date().toISOString(),
            action: 'assigned'
        });
        
        saveServices();
        assignMessage.textContent = 'Servicio asignado exitosamente.';
        assignMessage.className = 'text-success mt-3';
        
        // Determinar el tipo de notificación
        let notificationMessage;
        if (isReassignment) {
            notificationMessage = `🔄 ¡Servicio REASIGNADO! ID: ${serviceId}. Cliente: ${service.clientName}. Ubicación: ${service.location}. El servicio ha sido reasignado a ti después de haber sido desasignado anteriormente.`;
            console.log(`🔄 Enviando notificación de reasignación al técnico ${technicianId} para el servicio ${serviceId}`);
        } else {
            notificationMessage = `¡Nuevo servicio asignado! ID: ${serviceId}. Cliente: ${service.clientName}. Ubicación: ${service.location}.`;
            console.log(`📨 Enviando notificación de nueva asignación al técnico ${technicianId} para el servicio ${serviceId}`);
        }
        
        sendNotification(technicianId, notificationMessage);
        
        renderAdminServicesList(services, 1);
        renderAssignedServicesList(1);
        populateAssignServiceDropdown();
        document.getElementById('assign-service-id').value = '';
        document.getElementById('assign-technician').value = '';
        renderEmployeeAssignedServices();
        
        // Actualizar contadores de filtros si el técnico asignado está logueado
        if (currentUser && currentUser.role === 'employee' && currentUser.id === technicianId) {
            updateEmployeeFilterCounts();
        }

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
    const assignedCardsElement = document.getElementById('assigned-services-list-cards');
    const assignedTable = assignedListElement.closest('table');
    const assignedTableHeader = assignedTable.querySelector('thead');
    
    // Agregar encabezado de numeración si no existe
    if (!assignedTableHeader.querySelector('th:first-child').innerHTML.includes('bi-hash')) {
        addNumberHeader(assignedTableHeader);
    }
    
    assignedListElement.innerHTML = '';
    assignedCardsElement.innerHTML = '';
    
    const assignedServices = services.filter(s => s.technicianId);
    const totalPages = getTotalPages(assignedServices.length);
    const paginatedServices = paginateArray(assignedServices, page);
    
    if (paginatedServices.length === 0) {
        // Mensaje para tabla
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="11" class="text-center text-muted py-4">
                <i class="bi bi-list-check" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay servicios asignados</strong>
            </td>
        `;
        assignedListElement.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-list-check" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No hay servicios asignados</strong>
        `;
        assignedCardsElement.appendChild(noResultsCard);
    } else {
        paginatedServices.forEach(service => {
            const canUnassign = !['Finalizado', 'Cancelado'].includes(service.status);
            const unassignButton = canUnassign ?
                `<button class="btn btn-secondary btn-sm" onclick="unassignService('${service.id}')">Desasignar</button>` :
                `<button class="btn btn-secondary btn-sm" disabled title="No se puede desasignar servicio finalizado/cancelado">Desasignar</button>`;

            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${service.id}</td>
                <td>${service.date}</td>
                <td>${service.serviceTime || '-'}</td>
                <td>${service.clientName}</td>
                <td>${service.serviceCode || '-'}</td>
                <td>${service.safeType}</td>
                <td>${service.description || '-'}</td>
                <td>${service.location}</td>
                <td>${getTechnicianNameById(service.technicianId)}</td>
                <td>${service.status}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')">Ver</button>
                    ${unassignButton}
                </td>
            `;
            assignedListElement.appendChild(row);
            
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
            
            // Generar información de servicios adicionales para la tarjeta
            let additionalServicesInfo = '';
            if (service.additionalServices && Array.isArray(service.additionalServices) && service.additionalServices.length > 0) {
                const totalAdditionalPrice = service.additionalServices.reduce((sum, additionalService) => sum + (additionalService.precio || 0), 0);
                additionalServicesInfo = `
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Servicios Adicionales:</span>
                        <span class="service-card-info-value">${service.additionalServices.length} servicio(s) - $${totalAdditionalPrice.toLocaleString()}</span>
                    </div>
                `;
            }

            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${service.id}</span>
                    <span class="service-card-status ${statusClass}">${service.status}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha:</span>
                        <span class="service-card-info-value">${service.date}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Hora:</span>
                        <span class="service-card-info-value">${service.serviceTime || '-'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Cliente:</span>
                        <span class="service-card-info-value">${service.clientName}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Código Servicio:</span>
                        <span class="service-card-info-value">${service.serviceCode || '-'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Tipo Servicio:</span>
                        <span class="service-card-info-value">${service.safeType}</span>
                    </div>
                    ${additionalServicesInfo}
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Ubicación:</span>
                        <span class="service-card-info-value">${service.location}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Técnico:</span>
                        <span class="service-card-info-value">${getTechnicianNameById(service.technicianId)}</span>
                    </div>
                </div>
                <div class="service-card-actions">
                    <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')">Ver</button>
                    ${unassignButton}
                </div>
            `;
            assignedCardsElement.appendChild(serviceCard);
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
                
                // Registrar la desasignación en el historial
                if (!service.assignmentHistory) {
                    service.assignmentHistory = [];
                }
                if (oldTechnicianId) {
                    service.assignmentHistory.push({
                        technicianId: oldTechnicianId,
                        assignedAt: new Date().toISOString(),
                        action: 'unassigned'
                    });
                }
                
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
                
                // Actualizar contadores de filtros si el técnico desasignado está logueado
                if (currentUser && currentUser.role === 'employee' && currentUser.id === oldTechnicianId) {
                    updateEmployeeFilterCounts();
                }
                //showAlert('Servicio desasignado exitosamente.');
            }
        }
    });
}


// --- Report Novelty/Problems ---

document.getElementById('novelty-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validar y corregir IDs antes de crear nuevo reporte
    validateAndCorrectIds();
    
    const serviceId = document.getElementById('novelty-service-id').value;
    const description = document.getElementById('novelty-description').value;

    // Debug: Verificar la generación del ID del reporte
    const generatedReportId = generateReportId();
    debugLog('ID de reporte generado:', generatedReportId);

    const newReport = {
        id: generatedReportId,
        date: new Date().toISOString().split('T')[0],
        serviceId: serviceId || 'N/A',
        reporterId: currentUser.id,
        reporterName: currentUser ? currentUser.username : 'Desconocido',
        description: description,
        replies: [],
        readForAdmin: false // Mark as unread for admin when a new report is created
    };
    
    debugLog('Nuevo reporte creado:', newReport);
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
            <td colspan="10" class="text-center text-muted py-4">
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
                <td>${service.date}</td>
                <td>${service.serviceTime || '-'}</td>
                <td>${service.clientName}</td>
                <td>${service.serviceCode || '-'}</td>
                <td>${service.safeType}</td>
                <td>${service.description || '-'}</td>
                <td>${service.location}</td>
                <td>${service.status}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')" title="Ver detalles">Ver</button>
                    <div class="dropdown d-inline-block ms-1">
                        <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="dropdownMenuButton${service.id}" data-bs-toggle="dropdown" aria-expanded="false" ${dropdownDisabled} title="${dropdownTitle}">
                            Estado
                        </button>
                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton${service.id}">
                            <li><a class="dropdown-item ${isStatusFixed || service.status === 'Pendiente' ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed} && '${service.status}' !== 'Pendiente') handleEmployeeServiceStatusChange('${service.id}', 'Pendiente')">Pendiente</a></li>
                            <li><a class="dropdown-item ${isStatusFixed || service.status === 'En proceso' ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed} && '${service.status}' !== 'En proceso') handleEmployeeServiceStatusChange('${service.id}', 'En proceso')">En proceso</a></li>
                            <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="console.log('Click en Finalizado (desktop) para servicio:', '${service.id}'); if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Finalizado')">Finalizado</a></li>
                            <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Cancelado')">Cancelado</a></li>
                        </ul>
                    </div>
                    ${showStartButton ? `<button class="btn btn-success btn-sm ms-1" onclick="startService('${service.id}')" title="Iniciar servicio">Iniciar</button>` : ''}
                    <button class="btn btn-danger btn-sm ms-1" data-bs-toggle="modal" data-bs-target="#reportNoveltyModal" onclick="prefillNoveltyServiceId('${service.id}')" title="Reportar novedad">Novedad</button>
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
            
            // Generar información de servicios adicionales para la tarjeta
            let additionalServicesInfo = '';
            if (service.additionalServices && Array.isArray(service.additionalServices) && service.additionalServices.length > 0) {
                const totalAdditionalPrice = service.additionalServices.reduce((sum, additionalService) => sum + (additionalService.precio || 0), 0);
                additionalServicesInfo = `
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Servicios Adicionales:</span>
                        <span class="service-card-info-value">${service.additionalServices.length} servicio(s) - $${totalAdditionalPrice.toLocaleString()}</span>
                    </div>
                `;
            }

            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${service.id}</span>
                    <span class="service-card-status ${statusClass}">${service.status}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha:</span>
                        <span class="service-card-info-value">${service.date}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Hora:</span>
                        <span class="service-card-info-value">${service.serviceTime || '-'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Tipo Servicio:</span>
                        <span class="service-card-info-value">${service.safeType}</span>
                    </div>
                    ${additionalServicesInfo}
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Ubicación:</span>
                        <span class="service-card-info-value">${service.location}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Técnico:</span>
                        <span class="service-card-info-value">${getTechnicianNameById(service.technicianId)}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Cliente:</span>
                        <span class="service-card-info-value">${service.clientName}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Teléfono:</span>
                        <span class="service-card-info-value">${service.clientPhone}</span>
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
                            <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="console.log('Click en Finalizado (móvil) para servicio:', '${service.id}'); if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Finalizado')">Finalizado</a></li>
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
    
    // Actualizar contadores de filtros
    updateEmployeeFilterCounts();
    
    updateNotificationBadges();
}

function handleEmployeeServiceStatusChange(id, newStatus) {
    console.log('handleEmployeeServiceStatusChange llamado con id:', id, 'newStatus:', newStatus);
    
    const service = services.find(s => s.id === id);
    console.log('Servicio encontrado en handleEmployeeServiceStatusChange:', service);
    
    if (!service) {
        console.error('No se encontró el servicio con ID:', id);
        return;
    }

    if (['Finalizado', 'Cancelado'].includes(service.status)) {
        console.log('Servicio ya finalizado o cancelado, no se puede cambiar estado');
        showAlert('No se puede cambiar el estado de un servicio finalizado o cancelado.');
        return;
    }

    if (newStatus === 'Finalizado') {
        console.log('Intentando abrir modal de finalización para servicio:', id);
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
                // Cerrar el modal antes de mostrar la alerta para evitar que aparezca detrás
                cancelReasonModal.hide();
                setTimeout(() => {
                    showAlert('El motivo de cancelación es obligatorio.');
                }, 300);
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
    console.log('openServiceFinalizationModal llamado con serviceId:', serviceId);
    
    const service = services.find(s => s.id === serviceId);
    console.log('Servicio encontrado:', service);
    
    if (service) {
        try {
            // Verificar que el modal existe
            const modalElement = document.getElementById('registerServiceModal');
            console.log('Elemento del modal encontrado:', modalElement);
            
            if (!modalElement) {
                console.error('ERROR: No se encontró el elemento del modal registerServiceModal');
                showAlert('Error: No se pudo abrir el modal de finalización. Contacte al administrador.');
                return;
            }
            
            // Llenar los campos del formulario
            document.getElementById('edit-service-id').value = service.id;
            document.getElementById('registerServiceModalLabel').textContent = `Finalizar Servicio: ${service.id}`;
            document.getElementById('service-date').value = service.date;
            document.getElementById('service-time').value = service.serviceTime || '';
            
            // Cargar código de servicio y tipo de servicio
            // Primero poblar el dropdown de códigos de servicio
            populateServiceCodes();
            
            // Luego establecer el valor del código de servicio
            document.getElementById('service-code').value = service.serviceCode || '';
            
            // Cargar automáticamente el tipo y descripción basado en el código
            loadServiceDetails();
            
            // También establecer el tipo de servicio directamente por si acaso
            setServiceTypes(service.safeType);
            
            document.getElementById('service-description').value = service.description || ''; // Pre-llenar descripción
            document.getElementById('service-location').value = service.location;
            document.getElementById('service-client-name').value = service.clientName;
            document.getElementById('service-client-phone').value = service.clientPhone;
            document.getElementById('service-status').value = 'Finalizado'; // Establece el estado a Finalizado
            
            console.log('📝 Datos cargados en modal de finalización:', {
                id: service.id,
                date: service.date,
                serviceTime: service.serviceTime,
                serviceCode: service.serviceCode,
                safeType: service.safeType,
                description: service.description,
                location: service.location,
                clientName: service.clientName,
                clientPhone: service.clientPhone,
                status: 'Finalizado'
            });

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
            console.log('Inicializando signature pads...');
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
            const elementsToDisable = [
                'service-date',
                'service-time',
                'service-code',
                'service-type-bovedas',
                'service-type-puertas', 
                'service-type-pasatulas',
                'service-description',
                'service-location',
                'service-client-name',
                'service-client-phone',
                'service-status'
            ];
            
            elementsToDisable.forEach(elementId => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.disabled = true;
                    console.log(`✅ Campo ${elementId} deshabilitado`);
                } else {
                    console.warn(`⚠️ Elemento ${elementId} no encontrado`);
                }
            });

            // Cargar servicios adicionales si existen
            loadAdditionalServicesInModal(service);
            
            console.log('Intentando abrir el modal...');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            console.log('Modal abierto exitosamente');
            
        } catch (error) {
            console.error('Error al abrir el modal de finalización:', error);
            showAlert('Error al abrir el modal de finalización: ' + error.message);
        }
    } else {
        console.error('ERROR: No se encontró el servicio con ID:', serviceId);
        showAlert('Error: No se encontró el servicio especificado.');
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
                timeout: 30000,           // Timeout de 30 segundos
                maximumAge: 0             // No usar ubicación en caché, obtener ubicación fresca
            };

            // Usar la instancia global de geolocalización
            if (!window.globalGeolocation) {
                window.globalGeolocation = new EnhancedGeolocation();
            }
            
            // Mostrar mensaje de carga
            showAlert('🌍 Obteniendo ubicación para cambio de estado...\n\nPor favor espera mientras obtenemos tu ubicación GPS.');
            
            window.globalGeolocation.getQuickLocation(
                (locationData) => {
                    // Éxito: ubicación obtenida
                    oldService.finalizationOrCancellationTime = locationData.timestamp;
                    oldService.finalizationOrCancellationLocation = {
                        latitude: locationData.latitude,
                        longitude: locationData.longitude,
                        accuracy: locationData.accuracy,
                        timestamp: locationData.timestamp,
                        altitude: locationData.altitude,
                        heading: locationData.heading,
                        speed: locationData.speed,
                        altitudeAccuracy: locationData.altitudeAccuracy,
                        browser: locationData.browser,
                        deviceInfo: locationData.deviceInfo,
                        context: locationData.context
                    };
                    
                            // Cerrar el modal de finalización si está abierto
        console.log('🔒 Cerrando modal de finalización...');
        const finalizationModal = bootstrap.Modal.getInstance(document.getElementById('registerServiceModal'));
        if (finalizationModal) {
            finalizationModal.hide();
            console.log('✅ Modal de finalización cerrado exitosamente');
        } else {
            console.warn('⚠️ No se encontró instancia del modal de finalización');
        }
                    
                    saveAndNotify();
                },
                (error) => {
                    // Error: mostrar mensaje específico
                    console.error('Error de geolocalización para cambio de estado:', error);
                    showAlert(`❌ ${error.message}\n\n${error.details || ''}\n\n🔧 Soluciones:\n• Verifica que el GPS esté activado\n• Permite el acceso a la ubicación en tu navegador\n• Asegúrate de tener conexión a internet\n• Intenta en un área con mejor señal GPS`);
                },
                'cambio_estado'
            );
        } else {
            saveAndNotify();
        }

        function saveAndNotify() {
            console.log(`💾 Guardando cambios y enviando notificación para servicio ${id}...`);
            console.log(`📊 Cambio de estado: ${oldStatus} → ${newStatus}`);
            console.log(`👤 Técnico: ${currentUser.username}`);
            
            try {
                // Guardar servicios
                console.log('🔄 Guardando servicios...');
                saveServices();
                console.log('✅ Servicios guardados exitosamente');
                
                // Actualizar vistas
                console.log('🔄 Actualizando vistas...');
                renderEmployeeAssignedServices(1);
                renderAdminServicesList(services, 1);
                updateEmployeeFilterCounts(); // Actualizar contadores de filtros
                console.log('✅ Vistas actualizadas');
                
                // Construir mensaje de notificación
                let notificationMessage = `El servicio ID: ${id} ha cambiado de estado de "${oldStatus}" a "${newStatus}" por el técnico ${currentUser.username}.`;
                if (newStatus === 'Cancelado' && cancellationReason) {
                    notificationMessage += ` Motivo: ${cancellationReason}`;
                }
                
                console.log(`📨 Enviando notificación: ${notificationMessage}`);
                console.log(`👥 Usuarios disponibles:`, users.map(u => ({ id: u.id, username: u.username, role: u.role })));
                
                // Enviar notificación con manejo de errores
                try {
                    sendNotification('admin', notificationMessage);
                    console.log('✅ Notificación enviada exitosamente');
                } catch (notificationError) {
                    console.error('❌ Error al enviar notificación:', notificationError);
                }
                
                // Verificar que la notificación se envió correctamente
                setTimeout(() => {
                    const adminNotifications = notifications.filter(n => {
                        const targetUser = users.find(u => u.id === n.userId);
                        return targetUser && targetUser.role === 'admin' && !n.read;
                    });
                    console.log(`✅ Verificación: ${adminNotifications.length} notificaciones no leídas para admin`);
                }, 100);
                
                // Cerrar el modal de finalización de servicio de manera robusta
                console.log('🔒 Cerrando modal de finalización...');
                const modalClosed = closeModalMobile('registerServiceModal');
                if (modalClosed) {
                    console.log('✅ Modal de finalización cerrado exitosamente');
                } else {
                    console.warn('⚠️ No se pudo cerrar el modal de finalización automáticamente');
                }
            } catch (error) {
                console.error('❌ Error en saveAndNotify:', error);
                showAlert('❌ Error al procesar el cambio de estado. Por favor, intente nuevamente.');
            }
            
            // Mostrar mensaje de éxito con ubicación para cancelación
            if (newStatus === 'Cancelado') {
                // Cerrar el modal de cancelación si está abierto de manera robusta
                console.log('🔒 Cerrando modal de cancelación...');
                const cancelModalClosed = closeModalMobile('cancelReasonModal');
                if (cancelModalClosed) {
                    console.log('✅ Modal de cancelación cerrado exitosamente');
                } else {
                    console.warn('⚠️ No se pudo cerrar el modal de cancelación automáticamente');
                }
                
                // Mostrar alerta con ubicación detallada después de un pequeño delay
                setTimeout(() => {
                    if (oldService.finalizationOrCancellationLocation) {
                        if (!window.globalGeolocation) {
                            window.globalGeolocation = new EnhancedGeolocation();
                        }
                        const displayInfo = window.globalGeolocation.formatLocationForDisplay(oldService.finalizationOrCancellationLocation);
                        
                        showAlert(`✅ Servicio cancelado exitosamente.\n\n📍 Ubicación registrada:\nCoordenadas: ${displayInfo.coordinates}\nPrecisión: ${displayInfo.accuracy}\nDirección: ${displayInfo.direction}\nVelocidad: ${displayInfo.speed}\nAltitud: ${displayInfo.altitude}\nNavegador: ${displayInfo.browser}\n\nMotivo de cancelación: ${cancellationReason}\n\nEl servicio ha sido marcado como "Cancelado" y se ha registrado la ubicación de cancelación.`);
                    } else {
                        showAlert(`✅ Servicio cancelado exitosamente.\n\nMotivo de cancelación: ${cancellationReason}\n\nEl servicio ha sido marcado como "Cancelado".`);
                    }
                }, 300);
            } else if (newStatus === 'Finalizado') {
                // Mostrar mensaje de éxito para servicios finalizados
                setTimeout(() => {
                    if (oldService.finalizationOrCancellationLocation) {
                        if (!window.globalGeolocation) {
                            window.globalGeolocation = new EnhancedGeolocation();
                        }
                        const displayInfo = window.globalGeolocation.formatLocationForDisplay(oldService.finalizationOrCancellationLocation);
                        
                        showAlert(`✅ Servicio finalizado exitosamente.\n\n📍 Ubicación registrada:\nCoordenadas: ${displayInfo.coordinates}\nPrecisión: ${displayInfo.accuracy}\nDirección: ${displayInfo.direction}\nVelocidad: ${displayInfo.speed}\nAltitud: ${displayInfo.altitude}\nNavegador: ${displayInfo.browser}\n\nEl servicio ha sido marcado como "Finalizado" y se ha registrado la ubicación de finalización.`);
                    } else {
                        showAlert(`✅ Servicio finalizado exitosamente.\n\nEl servicio ha sido marcado como "Finalizado".`);
                    }
                }, 300);
            }
        }
    }
}

function startService(serviceId) {
    // Usar la instancia global de geolocalización
    if (!window.globalGeolocation) {
        window.globalGeolocation = new EnhancedGeolocation();
    }
    
    // Mostrar mensaje de carga
    showAlert('🌍 Obteniendo ubicación para iniciar servicio...\n\nPor favor espera mientras obtenemos tu ubicación GPS.');
    
    window.globalGeolocation.getQuickLocation(
        (locationData) => {
            // Éxito: ubicación obtenida
            saveServiceLocation(serviceId, locationData);
        },
        (error) => {
            // Error: mostrar mensaje específico
            console.error('Error de geolocalización:', error);
            showAlert(`❌ ${error.message}\n\n${error.details || ''}\n\n🔧 Soluciones:\n• Verifica que el GPS esté activado\n• Permite el acceso a la ubicación en tu navegador\n• Asegúrate de tener conexión a internet\n• Intenta en un área con mejor señal GPS`);
        },
        'inicio_servicio'
    );
}

function saveServiceLocation(serviceId, locationData) {
    const serviceIndex = services.findIndex(s => s.id === serviceId);
    if (serviceIndex !== -1) {
        if (['Finalizado', 'Cancelado', 'En proceso'].includes(services[serviceIndex].status)) {
            showAlert('Este servicio ya está en proceso, finalizado o cancelado.');
            return;
        }

        services[serviceIndex].startTime = locationData.timestamp;
        services[serviceIndex].startLocation = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
            timestamp: locationData.timestamp,
            altitude: locationData.altitude,
            heading: locationData.heading,
            speed: locationData.speed,
            altitudeAccuracy: locationData.altitudeAccuracy,
            browser: locationData.browser,
            deviceInfo: locationData.deviceInfo,
            context: locationData.context
        };
        services[serviceIndex].status = 'En proceso';
        saveServices();
        renderEmployeeAssignedServices(1);
        renderAdminServicesList(services, 1);

        // Cerrar cualquier modal abierto
        const finalizationModal = bootstrap.Modal.getInstance(document.getElementById('registerServiceModal'));
        if (finalizationModal) {
            finalizationModal.hide();
        }

        // Formatear información para mostrar al usuario
        if (!window.globalGeolocation) {
            window.globalGeolocation = new EnhancedGeolocation();
        }
        const displayInfo = window.globalGeolocation.formatLocationForDisplay(locationData);
        
        const message = `El técnico ${currentUser.username} ha iniciado el servicio ID: ${serviceId} a las ${displayInfo.timestamp} en la ubicación: ${displayInfo.coordinates} (Precisión: ${displayInfo.accuracy}).`;
        sendNotification('admin', message);
        
        showAlert(`✅ Servicio iniciado exitosamente.\n\n📍 Ubicación registrada:\nCoordenadas: ${displayInfo.coordinates}\nPrecisión: ${displayInfo.accuracy}\nDirección: ${displayInfo.direction}\nVelocidad: ${displayInfo.speed}\nAltitud: ${displayInfo.altitude}\nNavegador: ${displayInfo.browser}\n\nEl estado del servicio ha cambiado a "En proceso".`);
    }
}

function prefillNoveltyServiceId(serviceId) {
    document.getElementById('novelty-service-id').value = serviceId;
}

// --- Notifications ---

function sendNotification(targetRoleOrUserId, message) {
    console.log(`🔔 Enviando notificación a: ${targetRoleOrUserId}`, { message });
    
    try {
        // Verificar que users esté disponible
        if (!users || !Array.isArray(users)) {
            console.error('❌ users no está disponible o no es un array');
            return;
        }
        
        let targetUsers = [];
        if (targetRoleOrUserId === 'admin') {
            targetUsers = users.filter(u => u.role === 'admin');
            console.log(`👥 Usuarios admin encontrados:`, targetUsers.map(u => ({ id: u.id, username: u.username })));
        } else if (typeof targetRoleOrUserId === 'string' && targetRoleOrUserId.startsWith('_')) {
            const targetUser = users.find(u => u.id === targetRoleOrUserId);
            if (targetUser) {
                targetUsers.push(targetUser);
                console.log(`👤 Usuario específico encontrado:`, { id: targetUser.id, username: targetUser.username });
            }
        } else {
            console.warn("❌ Invalid notification target:", targetRoleOrUserId);
            return;
        }

    if (targetUsers.length > 0) {
        let notificationsCreated = 0;
        targetUsers.forEach(user => {
            // Evitar duplicar notificaciones para el mismo usuario con el mismo mensaje
            const existingNotification = notifications.find(n => 
                n.userId === user.id && 
                n.message === message && 
                !n.read &&
                (new Date() - new Date(n.timestamp)) < 60000 // Solo verificar notificaciones de los últimos 60 segundos
            );
            
            if (!existingNotification) {
                const newNotification = {
                    id: generateId(),
                    userId: user.id,
                    message: message,
                    timestamp: new Date().toISOString(),
                    read: false
                };
                notifications.push(newNotification);
                notificationsCreated++;
                console.log(`✅ Notificación creada para usuario ${user.username}:`, newNotification);
            } else {
                console.log(`⚠️ Notificación duplicada evitada para usuario ${user.username}`);
            }
        });
        
        if (notificationsCreated > 0) {
            saveNotifications();
            updateNotificationBadges();
            console.log(`📨 ${notificationsCreated} notificaciones enviadas exitosamente`);
        } else {
            console.log(`ℹ️ No se crearon nuevas notificaciones (posiblemente duplicadas)`);
        }
    } else {
        console.warn("❌ No se encontraron usuarios para enviar notificación");
    }
    } catch (error) {
        console.error('❌ Error en sendNotification:', error);
    }
}

function renderAdminNotifications(page = 1) {
    console.log('📋 Renderizando notificaciones de administrador...');
    currentAdminNotificationsPage = page;
    const notificationsList = document.getElementById('admin-notifications-list');
    const notificationsContainer = notificationsList.closest('.card-body');
    
    notificationsList.innerHTML = '';
    const adminNotifications = notifications.filter(n => {
        const targetUser = users.find(u => u.id === n.userId);
        return targetUser && targetUser.role === 'admin';
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`📊 Total notificaciones admin encontradas: ${adminNotifications.length}`);

    const totalPages = getTotalPages(adminNotifications.length);
    const paginatedNotifications = paginateArray(adminNotifications, page);

    if (paginatedNotifications.length === 0) {
        notificationsList.innerHTML = '<p>No hay notificaciones para administradores.</p>';
        console.log('ℹ️ No hay notificaciones para mostrar');
    } else {
        console.log(`📄 Mostrando ${paginatedNotifications.length} notificaciones en página ${page}`);
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
    console.log('✅ Notificaciones de administrador renderizadas');
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
    console.log('🔄 Actualizando badges de notificaciones...');
    
    const adminReportsTab = document.getElementById('admin-reports-tab');
    const adminNotificationsTab = document.getElementById('admin-notifications-tab');
    const employeeNotificationsTab = document.getElementById('employee-notifications-tab');

    if (currentUser && currentUser.role === 'admin') {
        const unreadReportsCount = reports.filter(r => !r.readForAdmin).length;
        const unreadAdminNotificationsCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length;

        console.log(`📊 Admin - Reportes no leídos: ${unreadReportsCount}, Notificaciones no leídas: ${unreadAdminNotificationsCount}`);

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

        console.log(`📊 Employee - Notificaciones no leídas: ${unreadEmployeeNotificationsCount}, Respuestas no leídas: ${unreadReportRepliesCount}`);

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
    
    console.log('✅ Badges de notificaciones actualizados');
}

// --- Función de prueba del sistema de notificaciones ---
function testNotificationSystem() {
    console.log('🧪 Probando sistema de notificaciones...');
    
    // Verificar que hay usuarios admin
    const adminUsers = users.filter(u => u.role === 'admin');
    console.log('👥 Usuarios admin encontrados:', adminUsers);
    
    if (adminUsers.length === 0) {
        showAlert('❌ No se encontraron usuarios administradores para enviar notificaciones de prueba.');
        return;
    }
    
    // Enviar notificación de prueba
    const testMessage = `🧪 NOTIFICACIÓN DE PRUEBA: El sistema de notificaciones está funcionando correctamente. Fecha: ${new Date().toLocaleString()}`;
    sendNotification('admin', testMessage);
    
    // Actualizar la vista de notificaciones
    renderAdminNotifications(1);
    
    showAlert('✅ Notificación de prueba enviada. Verifica en la pestaña de notificaciones.');
}

// --- Función para limpiar notificaciones antiguas ---
function cleanOldNotifications() {
    console.log('🧹 Limpiando notificaciones antiguas...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const initialCount = notifications.length;
    const oldNotifications = notifications.filter(n => new Date(n.timestamp) < thirtyDaysAgo);
    
    // Eliminar notificaciones antiguas
    notifications = notifications.filter(n => new Date(n.timestamp) >= thirtyDaysAgo);
    
    if (oldNotifications.length > 0) {
        saveNotifications();
        console.log(`🗑️ Eliminadas ${oldNotifications.length} notificaciones antiguas (más de 30 días)`);
        showAlert(`🧹 Limpieza completada:\n\n🗑️ Se eliminaron ${oldNotifications.length} notificaciones antiguas (más de 30 días)\n📊 Total de notificaciones: ${initialCount} → ${notifications.length}`);
    } else {
        showAlert('ℹ️ No hay notificaciones antiguas para limpiar.\n\nTodas las notificaciones son recientes (menos de 30 días).');
    }
    
    // Actualizar la vista
    renderAdminNotifications(1);
    
    return oldNotifications.length;
}

// --- Función para verificar el estado del sistema de notificaciones ---
function checkNotificationSystemStatus() {
    console.log('🔍 Verificando estado del sistema de notificaciones...');
    
    const adminUsers = users.filter(u => u.role === 'admin');
    const totalNotifications = notifications.length;
    const unreadNotifications = notifications.filter(n => !n.read).length;
    const adminNotifications = notifications.filter(n => {
        const targetUser = users.find(u => u.id === n.userId);
        return targetUser && targetUser.role === 'admin';
    });
    const unreadAdminNotifications = adminNotifications.filter(n => !n.read);
    
    console.log('📊 Estado del sistema:');
    console.log(`  - Usuarios admin: ${adminUsers.length}`);
    console.log(`  - Total notificaciones: ${totalNotifications}`);
    console.log(`  - Notificaciones no leídas: ${unreadNotifications}`);
    console.log(`  - Notificaciones admin: ${adminNotifications.length}`);
    console.log(`  - Notificaciones admin no leídas: ${unreadAdminNotifications.length}`);
    
    // Mostrar alerta con el estado del sistema
    const statusMessage = `🔍 Estado del Sistema de Notificaciones:\n\n` +
        `👥 Usuarios administradores: ${adminUsers.length}\n` +
        `📨 Total de notificaciones: ${totalNotifications}\n` +
        `📬 Notificaciones no leídas: ${unreadNotifications}\n` +
        `👨‍💼 Notificaciones para admin: ${adminNotifications.length}\n` +
        `🔔 Notificaciones admin no leídas: ${unreadAdminNotifications.length}\n\n` +
        `${adminUsers.length === 0 ? '⚠️ ADVERTENCIA: No hay usuarios administradores configurados' : '✅ Sistema funcionando correctamente'}`;
    
    showAlert(statusMessage);
    
    return {
        adminUsers: adminUsers.length,
        totalNotifications,
        unreadNotifications,
        adminNotifications: adminNotifications.length,
        unreadAdminNotifications: unreadAdminNotifications.length
    };
}

// --- Función para simular finalización de servicio y verificar notificaciones ---
function testServiceFinalizationNotification() {
    console.log('🧪 Probando notificación de finalización de servicio...');
    
    // Verificar que hay usuarios admin
    const adminUsers = users.filter(u => u.role === 'admin');
    if (adminUsers.length === 0) {
        showAlert('❌ No hay usuarios administradores para enviar notificaciones de prueba.');
        return;
    }
    
    // Verificar que hay servicios disponibles
    if (services.length === 0) {
        showAlert('❌ No hay servicios disponibles para la prueba.');
        return;
    }
    
    // Buscar un servicio que no esté finalizado
    const availableService = services.find(s => s.status !== 'Finalizado' && s.status !== 'Cancelado');
    if (!availableService) {
        showAlert('❌ No hay servicios disponibles para finalizar (todos están finalizados o cancelados).');
        return;
    }
    
    // Simular notificación de finalización
    const testMessage = `🧪 PRUEBA: El servicio ID: ${availableService.id} ha sido finalizado por el técnico ${currentUser?.username || 'Técnico de Prueba'}. Cliente: ${availableService.clientName || 'Cliente de Prueba'}, Ubicación: ${availableService.location || 'Ubicación de Prueba'}`;
    
    console.log(`📨 Enviando notificación de prueba: ${testMessage}`);
    sendNotification('admin', testMessage);
    
    // Actualizar la vista de notificaciones
    renderAdminNotifications(1);
    
    showAlert(`✅ Notificación de finalización de servicio enviada.\n\nServicio: ${availableService.id}\nCliente: ${availableService.clientName || 'Cliente de Prueba'}\n\nVerifica en la pestaña de notificaciones del administrador.`);
}

// --- Función para diagnosticar el estado del formulario de finalización ---
function diagnoseFinalizationForm() {
    console.log('🔍 Diagnosticando formulario de finalización...');
    
    const formData = {
        serviceId: document.getElementById('edit-service-id')?.value || 'No encontrado',
        date: document.getElementById('service-date')?.value || 'No encontrado',
        serviceCode: document.getElementById('service-code')?.value || 'No encontrado',
        safeType: document.getElementById('service-type')?.value || 'No encontrado',
        description: document.getElementById('service-description')?.value || 'No encontrado',
        location: document.getElementById('service-location')?.value || 'No encontrado',
        clientName: document.getElementById('service-client-name')?.value || 'No encontrado',
        clientPhone: document.getElementById('service-client-phone')?.value || 'No encontrado',
        status: document.getElementById('service-status')?.value || 'No encontrado'
    };
    
    console.log('📋 Datos del formulario:', formData);
    
    // Verificar campos requeridos para finalización
    const photoInput = document.getElementById('service-photo');
    const photoPreview = document.getElementById('service-photo-preview');
    const hasPhoto = photoInput?.files.length > 0 || (photoPreview?.src && photoPreview.src !== 'data:,' && !photoPreview.classList.contains('d-none'));
    
    const signatureStatus = {
        hasClientSignature: signaturePadClient && !signaturePadClient.isEmpty(),
        hasTechnicianSignature: signaturePadTechnician && !signaturePadTechnician.isEmpty(),
        hasPhoto: hasPhoto
    };
    
    console.log('✍️ Estado de firmas y foto:', signatureStatus);
    
    // Verificar si faltan campos
    let missingFields = [];
    if (!hasPhoto) missingFields.push('foto de evidencia');
    if (signaturePadClient && signaturePadClient.isEmpty()) missingFields.push('firma del cliente');
    if (signaturePadTechnician && signaturePadTechnician.isEmpty()) missingFields.push('firma del técnico');
    
    // Verificar estado del almacenamiento
    const storageStats = getStorageStats();
    const storageStatus = {
        services: storageStats.services,
        notifications: storageStats.notifications,
        reports: storageStats.reports,
        totalSize: storageStats.totalSize,
        isNearLimit: storageStats.totalSize > 5000000 // 5MB aproximado
    };
    
    const diagnosis = {
        formComplete: Object.values(formData).every(value => value !== 'No encontrado' && value !== ''),
        hasRequiredFields: missingFields.length === 0,
        missingFields: missingFields,
        currentUser: currentUser ? { username: currentUser.username, role: currentUser.role } : 'No hay usuario',
        modalOpen: document.getElementById('registerServiceModal')?.classList.contains('show') || false,
        storageStatus: storageStatus
    };
    
    console.log('🔍 Diagnóstico completo:', diagnosis);
    
    const message = `🔍 Diagnóstico del Formulario de Finalización:\n\n` +
        `📋 Formulario completo: ${diagnosis.formComplete ? '✅' : '❌'}\n` +
        `✅ Campos requeridos: ${diagnosis.hasRequiredFields ? '✅' : '❌'}\n` +
        `👤 Usuario: ${diagnosis.currentUser.username || 'No encontrado'} (${diagnosis.currentUser.role || 'No encontrado'})\n` +
        `🪟 Modal abierto: ${diagnosis.modalOpen ? '✅' : '❌'}\n\n` +
        `💾 Almacenamiento:\n` +
        `   - Servicios: ${storageStats.services}\n` +
        `   - Notificaciones: ${storageStats.notifications}\n` +
        `   - Reportes: ${storageStats.reports}\n` +
        `   - Tamaño: ${(storageStats.totalSize / 1024 / 1024).toFixed(2)} MB\n` +
        `   - Estado: ${storageStatus.isNearLimit ? '⚠️ Cerca del límite' : '✅ Normal'}\n\n` +
        `${missingFields.length > 0 ? `❌ Campos faltantes: ${missingFields.join(', ')}` : '✅ Todos los campos están completos'}`;
    
    showAlert(message);
    
    return diagnosis;
}





// --- Función para cerrar modales de manera robusta ---
function closeModalSafely(modalId) {
    console.log(`🔒 Intentando cerrar modal: ${modalId}`);
    
    try {
        // Intentar obtener la instancia del modal
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modalInstance) {
            modalInstance.hide();
            console.log(`✅ Modal ${modalId} cerrado exitosamente`);
            return true;
        } else {
            // Si no hay instancia, intentar crear una nueva y ocultarla
            const modalElement = document.getElementById(modalId);
            if (modalElement) {
                const newModalInstance = new bootstrap.Modal(modalElement);
                newModalInstance.hide();
                console.log(`✅ Modal ${modalId} cerrado con nueva instancia`);
                return true;
            } else {
                console.warn(`⚠️ No se encontró el elemento del modal: ${modalId}`);
                return false;
            }
        }
    } catch (error) {
        console.error(`❌ Error al cerrar modal ${modalId}:`, error);
        return false;
    }
}

// --- Función específica para cerrar modales en móvil ---
function closeModalMobile(modalId) {
    console.log(`📱 Cerrando modal en móvil: ${modalId}`);
    
    try {
        // Método 1: Intentar con la instancia existente
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modalInstance) {
            modalInstance.hide();
            console.log(`✅ Modal ${modalId} cerrado con instancia existente`);
            return true;
        }
        
        // Método 2: Crear nueva instancia y cerrar
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const newModalInstance = new bootstrap.Modal(modalElement);
            newModalInstance.hide();
            console.log(`✅ Modal ${modalId} cerrado con nueva instancia`);
            return true;
        }
        
        // Método 3: Forzar cierre con jQuery (si está disponible)
        if (typeof $ !== 'undefined') {
            $(`#${modalId}`).modal('hide');
            console.log(`✅ Modal ${modalId} cerrado con jQuery`);
            return true;
        }
        
        // Método 4: Ocultar manualmente el elemento
        const element = document.getElementById(modalId);
        if (element) {
            element.style.display = 'none';
            element.classList.remove('show');
            element.setAttribute('aria-hidden', 'true');
            element.removeAttribute('aria-modal');
            element.removeAttribute('role');
            
            // Remover backdrop
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Restaurar scroll del body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            console.log(`✅ Modal ${modalId} cerrado manualmente`);
            return true;
        }
        
        console.warn(`⚠️ No se pudo cerrar el modal: ${modalId}`);
        return false;
        
    } catch (error) {
        console.error(`❌ Error al cerrar modal móvil ${modalId}:`, error);
        return false;
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
            const serviceId = service.id.toLowerCase();
            const serviceCode = (service.serviceCode || '').toLowerCase();
            const clientName = service.clientName.toLowerCase();
            const safeType = service.safeType.toLowerCase();
            const technicianName = getTechnicianNameById(service.technicianId).toLowerCase();
            const status = service.status.toLowerCase();
            
            return serviceId.includes(searchTerm) ||
                   serviceCode.includes(searchTerm) ||
                   clientName.includes(searchTerm) ||
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

    // Exportar TODA la información del servicio incluyendo código de servicio
    const servicesToExportFormatted = servicesToExport.map(service => {
        const technicianName = getTechnicianNameById(service.technicianId);
        return {
            'ID Servicio': service.id,
            'Código de Servicio': service.serviceCode || 'N/A',
            'Fecha': service.date,
            'Tipo de Servicio': service.safeType,
            'Descripción': service.description || 'N/A',
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

// Funciones para el módulo de Costo Servicios
function renderCostoServiciosList(filteredCostoServicios = costoServicios) {
    const costoServiciosList = document.getElementById('costo-servicios-list');
    const costoServiciosCards = document.getElementById('costo-servicios-cards');
    
    costoServiciosList.innerHTML = '';
    costoServiciosCards.innerHTML = '';
    
    console.log('📋 Renderizando lista de costo servicios:', filteredCostoServicios);
    
    if (filteredCostoServicios.length === 0) {
        // Mensaje para tabla
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="6" class="text-center text-muted py-4">
                <i class="bi bi-currency-dollar" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay servicios de costo registrados</strong>
            </td>
        `;
        costoServiciosList.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-currency-dollar" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No hay servicios de costo registrados</strong>
        `;
        costoServiciosCards.appendChild(noResultsCard);
    } else {
        filteredCostoServicios.forEach(servicio => {
            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${servicio.codigo || 'N/A'}</td>
                <td>${servicio.fecha || 'N/A'}</td>
                <td>${servicio.tipo || 'N/A'}</td>
                <td>${servicio.descripcion || 'N/A'}</td>
                <td>$${(servicio.precio || 0).toLocaleString()}</td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="editCostoServicio('${servicio.id}')" title="Editar servicio">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCostoServicio('${servicio.id}')" title="Eliminar servicio">Eliminar</button>
                </td>
            `;
            costoServiciosList.appendChild(row);
            
            // Generar tarjeta móvil (vista móvil)
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${servicio.codigo || 'N/A'}</span>
                    <span class="service-card-status">$${(servicio.precio || 0).toLocaleString()}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha:</span>
                        <span class="service-card-info-value">${servicio.fecha || 'N/A'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Tipo Servicio:</span>
                        <span class="service-card-info-value">${servicio.tipo || 'N/A'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Descripción:</span>
                        <span class="service-card-info-value">${servicio.descripcion || 'N/A'}</span>
                    </div>
                </div>
                <div class="service-card-actions">
                    <button class="btn btn-warning btn-sm" onclick="editCostoServicio('${servicio.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCostoServicio('${servicio.id}')">Eliminar</button>
                </div>
            `;
            costoServiciosCards.appendChild(serviceCard);
        });
    }
    
    console.log('✅ Lista de costo servicios renderizada');
}

function filterCostoServicios() {
    const searchTerm = document.getElementById('search-costo-servicios').value.toLowerCase();
    const dateFrom = document.getElementById('filter-costo-servicio-date-from').value;
    const dateTo = document.getElementById('filter-costo-servicio-date-to').value;

    let filtered = costoServicios;

    // Filtrar por término de búsqueda
    if (searchTerm) {
        filtered = filtered.filter(servicio => {
            const codigo = (servicio.codigo || '').toLowerCase();
            const tipo = (servicio.tipo || '').toLowerCase();
            const descripcion = (servicio.descripcion || '').toLowerCase();
            const precio = (servicio.precio || 0).toString().toLowerCase();
            const fecha = (servicio.fecha || '').toLowerCase();
            
            return codigo.includes(searchTerm) ||
                   tipo.includes(searchTerm) ||
                   descripcion.includes(searchTerm) ||
                   precio.includes(searchTerm) ||
                   fecha.includes(searchTerm);
        });
    }

    // Filtrar por fecha desde
    if (dateFrom) {
        filtered = filtered.filter(servicio => {
            const servicioFecha = servicio.fecha || '';
            return servicioFecha >= dateFrom;
        });
    }

    // Filtrar por fecha hasta
    if (dateTo) {
        filtered = filtered.filter(servicio => {
            const servicioFecha = servicio.fecha || '';
            return servicioFecha <= dateTo;
        });
    }

    renderCostoServiciosList(filtered);
    console.log('🔍 Filtrado de costo servicios aplicado:', {
        searchTerm,
        dateFrom,
        dateTo,
        resultados: filtered.length
    });
}

function clearCostoServiciosFilters() {
    document.getElementById('search-costo-servicios').value = '';
    document.getElementById('filter-costo-servicio-date-from').value = '';
    document.getElementById('filter-costo-servicio-date-to').value = '';
    filterCostoServicios();
    console.log('🧹 Filtros de costo servicios limpiados');
}

function editCostoServicio(id) {
    console.log('🔍 Editando servicio con ID:', id);
    
    // Recargar datos desde localStorage para asegurar que estén actualizados
    costoServicios = JSON.parse(localStorage.getItem('costoServicios')) || [];
    console.log('📊 Datos recargados desde localStorage:', costoServicios);
    
    // Asegurar que costoServicios esté cargado
    if (!costoServicios || costoServicios.length === 0) {
        console.error('❌ No hay datos de costo servicios cargados');
        showAlert('Error: No hay datos de servicios disponibles');
        return;
    }
    
    const servicio = costoServicios.find(s => s.id === id);
    console.log('✅ Servicio encontrado:', servicio);
    
    if (servicio) {
        // Cargar datos en el formulario ANTES de abrir el modal
        forceLoadDataInModal(servicio);
        
        // Abrir el modal
        const modal = new bootstrap.Modal(document.getElementById('createCostoServicioModal'));
        modal.show();
        
        console.log('✅ Modal abierto con datos cargados');
        
    } else {
        console.error('❌ No se encontró el servicio con ID:', id);
        showAlert('Error: No se encontró el servicio a editar');
    }
}

function deleteCostoServicio(id) {
    showConfirm('¿Estás seguro de que deseas eliminar este servicio?', (confirmed) => {
        if (confirmed) {
            costoServicios = costoServicios.filter(s => s.id !== id);
            saveCostoServicios();
            renderCostoServiciosList();
        }
    });
}

function exportCostoServiciosToExcel() {
    const data = costoServicios.map(servicio => ({
        'Código Servicio': servicio.codigo,
        'Tipo de Servicio': servicio.tipo,
        'Descripción': servicio.descripcion,
        'Precio': servicio.precio
    }));

    exportToExcel(data, 'costo_servicios_consegur');
}

function importCostoServiciosFromExcel() {
    document.getElementById('import-costo-servicios-file').click();
}

function importServicesFromExcel() {
    document.getElementById('import-services-file').click();
}

// Función para convertir fecha serial de Excel a formato YYYY-MM-DD
function convertExcelDateToISO(excelDate) {
    // Si ya es una fecha válida en formato string, la devolvemos
    if (typeof excelDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
        return excelDate;
    }
    
    // Si es un número (fecha serial de Excel), la convertimos
    if (typeof excelDate === 'number') {
        // Excel cuenta los días desde el 1 de enero de 1900
        // Pero Excel tiene un bug: considera 1900 como año bisiesto cuando no lo es
        // Por eso restamos 2 días para corregir
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(excelEpoch.getTime() + (excelDate - 2) * 24 * 60 * 60 * 1000);
        
        // Formatear a YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    // Si es un objeto Date, lo convertimos
    if (excelDate instanceof Date) {
        const year = excelDate.getFullYear();
        const month = String(excelDate.getMonth() + 1).padStart(2, '0');
        const day = String(excelDate.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    // Si no podemos convertir, devolvemos el valor original
    console.warn('No se pudo convertir la fecha:', excelDate);
    return excelDate;
}

function handleServicesImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            console.log('Datos leídos del Excel:', jsonData);
            console.log('Columnas disponibles:', Object.keys(jsonData[0] || {}));

            if (jsonData.length === 0) {
                showAlert('El archivo Excel está vacío o no contiene datos válidos.');
                return;
            }

            let importedCount = 0;
            let errors = [];
            let warnings = [];

            jsonData.forEach((row, index) => {
                try {
                    console.log(`Procesando fila ${index + 2}:`, row);

                    // Validar campos obligatorios (aceptar mayúsculas y minúsculas)
                    const fechaRaw = row['Fecha'] || row['FECHA'];
                    const nombreCliente = row['Nombre del Cliente'] || row['NOMBRE DEL CLIENTE'];
                    const codigoServicio = row['Código de Servicio'] || row['CODIGO DE SERVICIO'];
                    
                    if (!fechaRaw) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Fecha' o 'FECHA'`);
                        return;
                    }
                    if (!nombreCliente) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Nombre del Cliente' o 'NOMBRE DEL CLIENTE'`);
                        return;
                    }
                    if (!codigoServicio) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Código de Servicio' o 'CODIGO DE SERVICIO'`);
                        return;
                    }

                    // Convertir la fecha de Excel a formato ISO
                    const fecha = convertExcelDateToISO(fechaRaw);
                    console.log(`Fila ${index + 2}: Fecha original: ${fechaRaw}, Fecha convertida: ${fecha}`);

                    // Buscar el tipo de servicio y descripción basado en el código
                    const costoServicio = costoServicios.find(cs => cs.codigo === codigoServicio);
                    if (!costoServicio) {
                        warnings.push(`Fila ${index + 2}: Código de servicio '${codigoServicio}' no encontrado en Costo Servicios`);
                    }
                    
                    const safeType = costoServicio ? costoServicio.tipo : (row['Tipo de Servicio'] || row['TIPO DE SERVICIO'] || '');
                    const description = costoServicio ? costoServicio.descripcion : (row['Descripción'] || row['DESCRIPCION'] || '');

                    const newService = {
                        id: generateServiceId(),
                        date: fecha,
                        clientName: nombreCliente,
                        serviceCode: codigoServicio,
                        safeType: safeType,
                        description: description,
                        location: row['Ubicación'] || row['UBICACIÓN'] || '',
                        clientPhone: row['Teléfono del Cliente'] || row['TELEFONO DEL CLIENTE'] || '',
                        status: row['Estado'] || row['ESTADO'] || 'Pendiente',
                        technicianId: '',
                        startTime: '',
                        finalizationOrCancellationTime: '',
                        startLocation: null,
                        finalizationOrCancellationLocation: null,
                        photoData: '',
                        technicianSignature: '',
                        clientSignature: '',
                        cancellationReason: ''
                    };
                    
                    services.push(newService);
                    importedCount++;
                    console.log(`Servicio importado exitosamente:`, newService);
                } catch (rowError) {
                    errors.push(`Fila ${index + 2}: Error al procesar - ${rowError.message}`);
                    console.error(`Error en fila ${index + 2}:`, rowError);
                }
            });

            saveServices();
            renderAdminServicesList();
            updateServicesStatistics();
            
            let message = `Se importaron ${importedCount} servicios exitosamente`;
            
            if (warnings.length > 0) {
                message += `\n\nAdvertencias:\n${warnings.slice(0, 3).join('\n')}`;
                if (warnings.length > 3) {
                    message += `\n... y ${warnings.length - 3} advertencias más`;
                }
            }
            
            if (errors.length > 0) {
                message += `\n\nErrores encontrados:\n${errors.slice(0, 5).join('\n')}`;
                if (errors.length > 5) {
                    message += `\n... y ${errors.length - 5} errores más`;
                }
            }
            
            showAlert(message);
        } catch (error) {
            console.error('Error al importar archivo:', error);
            showAlert(`Error al importar el archivo: ${error.message}\n\nEstructura esperada:\n- Fecha (o FECHA)\n- Nombre del Cliente (o NOMBRE DEL CLIENTE)\n- Código de Servicio (o CODIGO DE SERVICIO)\n- Ubicación (o UBICACIÓN)\n- Teléfono del Cliente (o TELEFONO DEL CLIENTE)\n- Estado (o ESTADO)\n\nEl sistema ahora acepta tanto mayúsculas como minúsculas.`);
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleCostoServiciosImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            console.log('Datos leídos del Excel de costo servicios:', jsonData);
            console.log('Columnas disponibles:', Object.keys(jsonData[0] || {}));

            if (jsonData.length === 0) {
                showAlert('El archivo Excel está vacío o no contiene datos válidos.');
                return;
            }

            let importedCount = 0;
            let errors = [];
            let warnings = [];

            jsonData.forEach((row, index) => {
                try {
                    console.log(`Procesando fila ${index + 2}:`, row);

                    // Validar campos obligatorios (aceptar mayúsculas y minúsculas)
                    const tipoServicio = row['Tipo de Servicio'] || row['TIPO DE SERVICIO'] || row['Tipo'] || row['TIPO'];
                    const descripcion = row['Descripción'] || row['DESCRIPCION'] || row['Descripcion'];
                    const precioRaw = row['Precio'] || row['PRECIO'];
                    
                    if (!tipoServicio) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Tipo de Servicio'`);
                        return;
                    }
                    if (!descripcion) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Descripción'`);
                        return;
                    }
                    if (!precioRaw) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Precio'`);
                        return;
                    }

                    // Convertir precio a número
                    const precio = parseFloat(precioRaw);
                    if (isNaN(precio) || precio < 0) {
                        errors.push(`Fila ${index + 2}: El precio debe ser un número válido mayor o igual a 0`);
                        return;
                    }

                    // Generar código automático
                    const codigoGenerado = generateCostoServicioCode();

                    const newServicio = {
                        id: generateId(),
                        codigo: codigoGenerado,
                        tipo: tipoServicio.toString().trim(),
                        descripcion: descripcion.toString().trim(),
                        precio: precio
                    };
                    
                    // Verificar si ya existe un servicio con el mismo código
                    const existingIndex = costoServicios.findIndex(s => s.codigo === newServicio.codigo);
                    if (existingIndex >= 0) {
                        costoServicios[existingIndex] = newServicio;
                        warnings.push(`Fila ${index + 2}: Servicio con código '${newServicio.codigo}' actualizado`);
                    } else {
                        costoServicios.push(newServicio);
                    }
                    importedCount++;
                    
                    console.log(`✅ Servicio procesado: ${newServicio.codigo} - ${newServicio.tipo}`);
                } catch (rowError) {
                    console.error(`Error procesando fila ${index + 2}:`, rowError);
                    errors.push(`Fila ${index + 2}: Error al procesar datos`);
                }
            });

            // Guardar y actualizar
            saveCostoServicios();
            renderCostoServiciosList();
            populateServiceCodes();

            // Mostrar resultados
            let message = `✅ Se importaron ${importedCount} servicios exitosamente`;
            if (warnings.length > 0) {
                message += `\n\n⚠️ Advertencias:\n${warnings.join('\n')}`;
            }
            if (errors.length > 0) {
                message += `\n\n❌ Errores:\n${errors.join('\n')}`;
            }

            showAlert(message);
            
            // Limpiar el input file
            event.target.value = '';
            
        } catch (error) {
            console.error('Error al importar archivo:', error);
            showAlert('Error al importar el archivo. Verifica que el formato sea correcto y que el archivo no esté corrupto.');
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// Funciones para el módulo de Remisiones
function renderRemisionesList(filteredRemisiones = remisiones) {
    console.log('🔄 Renderizando lista de remisiones...');
    console.log('📊 Remisiones a renderizar:', filteredRemisiones);
    
    const remisionesList = document.getElementById('remisiones-list');
    const remisionesCards = document.getElementById('remisiones-cards');
    
    if (!remisionesList || !remisionesCards) {
        console.error('❌ Elementos de remisiones no encontrados');
        return;
    }
    
    remisionesList.innerHTML = '';
    remisionesCards.innerHTML = '';
    
    if (filteredRemisiones.length === 0) {
        // Mensaje para tabla
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="8" class="text-center text-muted py-4">
                <i class="bi bi-file-earmark-text" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay remisiones registradas</strong>
            </td>
        `;
        remisionesList.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-file-earmark-text" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No hay remisiones registradas</strong>
        `;
        remisionesCards.appendChild(noResultsCard);
    } else {
        filteredRemisiones.forEach(remision => {
            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${remision.id}</td>
                <td>${remision.fecha}</td>
                <td>${remision.codigoServicio}</td>
                <td>${remision.tipoServicio}</td>
                <td>${remision.cliente}</td>
                <td>${getTechnicianNameById(remision.tecnicoId)}</td>
                <td>$${remision.precio.toLocaleString()}</td>
                <td>
                    <button class="btn btn-info btn-sm me-1" onclick="downloadRemisionPDF('${remision.id}')">Descargar PDF</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRemision('${remision.id}')">Eliminar</button>
                </td>
            `;
            remisionesList.appendChild(row);
            
            // Generar tarjeta móvil (vista móvil)
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${remision.id}</span>
                    <span class="service-card-status">$${remision.precio.toLocaleString()}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha:</span>
                        <span class="service-card-info-value">${remision.fecha}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Cliente:</span>
                        <span class="service-card-info-value">${remision.cliente}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Tipo Servicio:</span>
                        <span class="service-card-info-value">${remision.tipoServicio}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Técnico:</span>
                        <span class="service-card-info-value">${getTechnicianNameById(remision.tecnicoId)}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Evidencia:</span>
                        <span class="service-card-info-value">
                            <i class="bi ${remision.fotoEvidencia ? 'bi-camera-fill text-success' : 'bi-camera text-muted'}"></i>
                            ${remision.fotoEvidencia ? 'Con foto' : 'Sin foto'}
                        </span>
                    </div>
                </div>
                <div class="service-card-actions">
                    <button class="btn btn-info btn-sm" onclick="downloadRemisionPDF('${remision.id}')">PDF</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRemision('${remision.id}')">Eliminar</button>
                </div>
            `;
            remisionesCards.appendChild(serviceCard);
        });
    }
}

function generateRemisionFromService() {
    const modal = new bootstrap.Modal(document.getElementById('generateRemisionModal'));
    
    // Cargar servicios disponibles
    loadRemisionServices();
    
    // Configurar búsqueda
    setupRemisionServiceSearch();
    
    modal.show();
}

function loadRemisionServices(filteredServices = null) {
    const remisionServiceSelect = document.getElementById('remision-service-id');
    remisionServiceSelect.innerHTML = '<option value="">Seleccionar servicio...</option>';
    
    const servicesToShow = filteredServices || services.filter(service => service.status === 'Finalizado');
    
    servicesToShow.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.id} - ${service.clientName} - ${service.safeType}`;
        remisionServiceSelect.appendChild(option);
    });
}

function setupRemisionServiceSearch() {
    const searchInput = document.getElementById('remision-service-search');
    const remisionServiceSelect = document.getElementById('remision-service-id');
    const resultsElement = document.getElementById('remision-search-results');
    
    // Limpiar búsqueda al abrir el modal
    searchInput.value = '';
    const allFinalizedServices = services.filter(service => service.status === 'Finalizado');
    resultsElement.innerHTML = `<span class="text-muted">${allFinalizedServices.length} servicios finalizados disponibles</span>`;
    
    // Limpiar búsqueda cuando se cierre el modal
    const modal = document.getElementById('generateRemisionModal');
    modal.addEventListener('hidden.bs.modal', function() {
        searchInput.value = '';
        const allFinalizedServices = services.filter(service => service.status === 'Finalizado');
        resultsElement.innerHTML = `<span class="text-muted">${allFinalizedServices.length} servicios finalizados disponibles</span>`;
        remisionServiceSelect.value = '';
        loadRemisionServices(); // Cargar todos los servicios finalizados
    });
    
    // Botón para limpiar búsqueda
    const clearButton = document.getElementById('clear-remision-search');
    clearButton.addEventListener('click', function() {
        searchInput.value = '';
        const allFinalizedServices = services.filter(service => service.status === 'Finalizado');
        resultsElement.innerHTML = `<span class="text-muted">${allFinalizedServices.length} servicios finalizados disponibles</span>`;
        remisionServiceSelect.value = '';
        loadRemisionServices(); // Cargar todos los servicios finalizados
        searchInput.focus();
    });
    
    // Event listener para búsqueda en tiempo real
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const resultsElement = document.getElementById('remision-search-results');
        
        if (searchTerm === '') {
            // Si no hay término de búsqueda, mostrar todos los servicios finalizados
            const allFinalizedServices = services.filter(service => service.status === 'Finalizado');
            loadRemisionServices();
            resultsElement.innerHTML = `<span class="text-muted">${allFinalizedServices.length} servicios finalizados disponibles</span>`;
            return;
        }
        
        // Filtrar servicios que coincidan con el término de búsqueda
        const filteredServices = services.filter(service => {
            if (service.status !== 'Finalizado') return false;
            
            return service.id.toLowerCase().includes(searchTerm) ||
                   service.clientName.toLowerCase().includes(searchTerm) ||
                   service.safeType.toLowerCase().includes(searchTerm) ||
                   (service.description && service.description.toLowerCase().includes(searchTerm)) ||
                   (service.location && service.location.toLowerCase().includes(searchTerm)) ||
                   (service.serviceCode && service.serviceCode.toLowerCase().includes(searchTerm));
        });
        
        // Actualizar el dropdown con los servicios filtrados
        loadRemisionServices(filteredServices);
        
        // Actualizar contador de resultados
        if (filteredServices.length === 0) {
            resultsElement.innerHTML = '<span class="text-danger">No se encontraron servicios que coincidan con la búsqueda</span>';
        } else if (filteredServices.length === 1) {
            resultsElement.innerHTML = '<span class="text-success">1 servicio encontrado</span>';
            remisionServiceSelect.value = filteredServices[0].id;
        } else {
            resultsElement.innerHTML = `<span class="text-info">${filteredServices.length} servicios encontrados</span>`;
            remisionServiceSelect.value = '';
        }
    });
    
    // Event listener para búsqueda con Enter
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const options = remisionServiceSelect.options;
            
            // Si hay opciones disponibles, seleccionar la primera
            if (options.length > 1) {
                remisionServiceSelect.value = options[1].value;
                remisionServiceSelect.focus();
            }
        }
    });
}

function createRemisionFromService(serviceId) {
    console.log('🔄 Creando remisión para servicio ID:', serviceId);
    
    try {
        // Verificar que services esté cargado
        if (!services || !Array.isArray(services)) {
            console.error('❌ services no está disponible o no es un array');
            showAlert('Error: Datos de servicios no disponibles');
            return;
        }
        
        const service = services.find(s => s.id === serviceId);
        console.log('🔍 Servicio encontrado:', service);
        
        if (!service) {
            console.error('❌ Servicio no encontrado con ID:', serviceId);
            showAlert('Servicio no encontrado');
            return;
        }

        // Buscar el precio del servicio principal
        const costoServicio = costoServicios.find(cs => cs.codigo === service.serviceCode);
        const precioPrincipal = costoServicio ? costoServicio.precio : 0;
        console.log('💰 Precio del servicio principal:', precioPrincipal);

        // Calcular precio total incluyendo servicios adicionales
        let precioTotal = precioPrincipal;
        let serviciosAdicionales = [];
        
        if (service.additionalServices && Array.isArray(service.additionalServices)) {
            serviciosAdicionales = service.additionalServices;
            precioTotal += serviciosAdicionales.reduce((sum, servicio) => sum + (servicio.precio || 0), 0);
            console.log('📋 Servicios adicionales encontrados:', serviciosAdicionales);
            console.log('💰 Precio total con servicios adicionales:', precioTotal);
        }

        const remision = {
            id: generateRemisionId(),
            fecha: service.date,
            horaServicio: service.serviceTime || '',
            codigoServicio: service.serviceCode || '',
            tipoServicio: service.safeType,
            descripcion: service.description || '',
            ubicacion: service.location,
            tecnicoId: service.technicianId,
            cliente: service.clientName,
            telefonoCliente: service.clientPhone,
            horaInicio: service.startTime || '',
            horaFinalizacion: service.finalizationOrCancellationTime || '',
            ubicacionInicio: service.startLocation || '',
            ubicacionFin: service.finalizationOrCancellationLocation || '',
            fotoEvidencia: service.photo || '',
            firmaTecnico: service.technicianSignature || '',
            firmaCliente: service.clientSignature || '',
            precio: precioTotal,
            serviciosAdicionales: serviciosAdicionales,
            serviceId: serviceId
        };

        console.log('📝 Remisión creada:', remision);

        // Verificar que remisiones sea un array
        if (!Array.isArray(remisiones)) {
            console.error('❌ remisiones no es un array, inicializando...');
            remisiones = [];
        }

        remisiones.push(remision);
        console.log('✅ Remisión agregada al array, total:', remisiones.length);
        
        saveRemisiones();
        console.log('✅ Remisión guardada en localStorage');
        
        // Forzar la actualización de la vista de remisiones
        console.log('🔄 Actualizando vista de remisiones...');
        renderRemisionesList();
        console.log('✅ Lista de remisiones actualizada');
        
        // Actualizar también la vista de servicios si es necesario
        if (currentUser.role === 'admin') {
            renderAdminServicesList(services, 1);
        }
        
        // Remisión generada exitosamente sin mostrar alerta
        
    } catch (error) {
        console.error('❌ Error al crear remisión:', error);
        console.error('🔍 Detalles del error:', error.message, error.stack);
        showAlert('❌ Error al generar la remisión. Por favor, intente nuevamente.');
    }
}

function deleteRemision(id) {
    showConfirm('¿Estás seguro de que deseas eliminar esta remisión?', (confirmed) => {
        if (confirmed) {
            remisiones = remisiones.filter(r => r.id !== id);
            saveRemisiones();
            renderRemisionesList();
        }
    });
}

function exportRemisionesToExcel() {
    const data = remisiones.map(remision => ({
        'ID Remisión': remision.id,
        'Fecha': remision.fecha,
        'Código Servicio': remision.codigoServicio,
        'Tipo Servicio': remision.tipoServicio,
        'Descripción': remision.descripcion,
        'Ubicación Servicio': remision.ubicacion,
        'Ubicación Inicio': formatLocation(remision.ubicacionInicio),
        'Ubicación Fin': formatLocation(remision.ubicacionFin),
        'Técnico': getTechnicianNameById(remision.tecnicoId),
        'Cliente': remision.cliente,
        'Teléfono Cliente': remision.telefonoCliente,
        'Hora Inicio': formatTime(remision.horaInicio),
        'Hora Finalización': formatTime(remision.horaFinalizacion),
        'Precio': remision.precio,
        'Tiene Foto': remision.fotoEvidencia ? 'Sí' : 'No'
    }));

    exportToExcel(data, 'remisiones_consegur');
}

function filterRemisiones() {
    const searchTerm = document.getElementById('search-remisiones').value.toLowerCase();
    const dateFrom = document.getElementById('filter-remision-date-from').value;
    const dateTo = document.getElementById('filter-remision-date-to').value;

    let filteredRemisiones = remisiones;

    if (searchTerm) {
        filteredRemisiones = filteredRemisiones.filter(remision => {
            return remision.id.toLowerCase().includes(searchTerm) ||
                   remision.codigoServicio.toLowerCase().includes(searchTerm) ||
                   remision.cliente.toLowerCase().includes(searchTerm) ||
                   remision.tipoServicio.toLowerCase().includes(searchTerm);
        });
    }

    if (dateFrom) {
        filteredRemisiones = filteredRemisiones.filter(remision => remision.fecha >= dateFrom);
    }

    if (dateTo) {
        filteredRemisiones = filteredRemisiones.filter(remision => remision.fecha <= dateTo);
    }

    renderRemisionesList(filteredRemisiones);
}

function clearRemisionesFilters() {
    document.getElementById('search-remisiones').value = '';
    document.getElementById('filter-remision-date-from').value = '';
    document.getElementById('filter-remision-date-to').value = '';
    renderRemisionesList();
}

// Función para formatear hora en formato HH:MM:SS
function formatTime(timeString) {
    if (!timeString) return 'N/A';
    
    try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return 'N/A';
        
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        return `${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.error('Error al formatear hora:', error);
        return 'N/A';
    }
}

// Función para formatear ubicación GPS
function formatLocation(locationData) {
    if (!locationData) return 'N/A';
    
    try {
        // Si es un string, devolverlo directamente
        if (typeof locationData === 'string') {
            return locationData;
        }
        
        // Si es un objeto con coordenadas GPS
        if (locationData.latitude && locationData.longitude) {
            const lat = locationData.latitude.toFixed(6);
            const lng = locationData.longitude.toFixed(6);
            
            return `Lat: ${lat}, Lng: ${lng}`;
        }
        
        // Si es un objeto con dirección
        if (locationData.address) {
            return locationData.address;
        }
        
        return 'N/A';
    } catch (error) {
        console.error('Error al formatear ubicación:', error);
        return 'N/A';
    }
}

function downloadRemisionPDF(remisionId) {
    const remision = remisiones.find(r => r.id === remisionId);
    if (!remision) {
        showAlert('Remisión no encontrada');
        return;
    }

    // Crear el PDF usando jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configurar fuente y tamaño
    doc.setFont('helvetica');
    
    // Función para cargar el logo de CONSEGUR desde assets
    function loadConsegurLogo() {
        console.log('🖼️ Cargando logo de CONSEGUR desde assets...');
        
        // URL del logo de CONSEGUR
        const logoUrl = 'assets/logoconsegur.png';
        
        // Crear imagen para cargar el logo
        const img = new Image();
        
        img.onload = () => {
            try {
                console.log('✅ Logo de CONSEGUR cargado correctamente:', {
                    width: img.width,
                    height: img.height,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight
                });
                
                // Crear canvas para convertir a base64
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const logoBase64 = canvas.toDataURL('image/png');
                console.log('✅ Base64 generado del logo de CONSEGUR');
                
                // Calcular dimensiones optimizadas para el PDF
                const maxWidth = 60; // Ancho máximo en mm
                const maxHeight = 30; // Alto máximo en mm
                
                let logoWidth = maxWidth;
                let logoHeight = (img.height * logoWidth) / img.width;
                
                // Si la altura es muy grande, ajustar proporcionalmente
                if (logoHeight > maxHeight) {
                    logoHeight = maxHeight;
                    logoWidth = (img.width * logoHeight) / img.height;
                }
                
                // Posición corregida hacia la derecha
                const logoX = 100; // Un poco más a la derecha
                const logoY = 20; // Subido horizontalmente
                
                // Agregar el logo al PDF
                doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
                console.log('✅ Logo de CONSEGUR agregado exitosamente al PDF:', {
                    position: { x: logoX, y: logoY },
                    size: { width: logoWidth, height: logoHeight },
                    originalSize: { width: img.width, height: img.height }
                });
                
                // Continuar con el resto del contenido del PDF
                generatePDFContent(doc, remision);
                
            } catch (e) {
                console.error('❌ Error al procesar logo de CONSEGUR:', e);
                console.log('⚠️ Continuando sin logo...');
                generatePDFContent(doc, remision);
            }
        };
        
        img.onerror = () => {
            console.error('❌ Error al cargar logo de CONSEGUR desde:', logoUrl);
            console.log('⚠️ Continuando sin logo...');
            generatePDFContent(doc, remision);
        };
        
        // Cargar la imagen desde la URL
        img.src = logoUrl;
    }
    
    // Iniciar la carga del logo
    loadConsegurLogo();
}

function generatePDFContent(doc, remision) {
    
    // Información de la empresa en la parte superior izquierda (margen reducido)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold'); // Negrilla para CONSEGUR S.A.S.
    doc.text('CONSEGUR S.A.S.', 20, 20);
    doc.setFont('helvetica', 'normal'); // Volver a normal
    doc.setFontSize(8);
    doc.text('NIT: 900514502-7', 20, 26);
    doc.text('IVA RÉGIMEN COMÚN', 20, 32);
    doc.text('CLL 7 # 50-71', 20, 38);
    doc.text('TELÉFONO 448 86 00', 20, 44);
    doc.text('MEDELLÍN ANTIOQUIA', 20, 50);
    
    // Título del documento centrado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold'); // Negrilla para REMISIÓN DE SERVICIO
    doc.text('REMISIÓN DE SERVICIO', 105, 60, { align: 'center' });
    doc.setFont('helvetica', 'normal'); // Volver a normal
    
    // Línea separadora
    doc.line(20, 65, 190, 65);
    
    // Información de la remisión organizada en dos columnas
    doc.setFontSize(10);
    
    // Columna izquierda
    doc.text('ID Remisión:', 20, 80);
    doc.text(remision.id, 55, 80);
    
    doc.text('Fecha:', 20, 90);
    doc.text(remision.fecha, 55, 90);
    
    doc.text('Hora Servicio:', 20, 100);
    doc.text(remision.horaServicio || '-', 55, 100);
    
    doc.text('Código Servicio:', 20, 110);
    doc.text(remision.codigoServicio, 55, 110);
    
    doc.text('Tipo Servicio:', 20, 120);
    // Dividir tipo de servicio en múltiples líneas si es muy largo
    const tipoLines = doc.splitTextToSize(remision.tipoServicio, 50);
    doc.text(tipoLines, 55, 120);
    
    // Mostrar servicios adicionales después del tipo de servicio
    if (remision.serviciosAdicionales && remision.serviciosAdicionales.length > 0) {
        // Crear el texto de servicios adicionales en una sola línea
        const serviciosText = remision.serviciosAdicionales.map((servicio, index) => 
            `${index + 1}. ${servicio.codigo} - ${servicio.tipo}`
        ).join(' ');
        
        doc.text('Servicios Adicionales:', 20, 130);
        const serviciosLines = doc.splitTextToSize(serviciosText, 50);
        doc.text(serviciosLines, 55, 130);
        
        // Calcular la posición de ubicación basada en las líneas de servicios adicionales
        const yPosition = 130 + (serviciosLines.length * 4) + 5;
        doc.text('Ubicación Servicio:', 20, yPosition);
        const ubicServicioLines = doc.splitTextToSize(remision.ubicacion, 50);
        doc.text(ubicServicioLines, 55, yPosition);
    } else {
        doc.text('Ubicación Servicio:', 20, 130);
        const ubicServicioLines = doc.splitTextToSize(remision.ubicacion, 50);
        doc.text(ubicServicioLines, 55, 130);
    }
    
    // Columna derecha
    doc.text('Cliente:', 110, 80);
    doc.text(remision.cliente, 145, 80);
    
    doc.text('Teléfono:', 110, 90);
    doc.text(remision.telefonoCliente, 145, 90);
    
    doc.text('Hora Inicio:', 110, 100);
    doc.text(formatTime(remision.horaInicio), 145, 100);
    
    doc.text('Hora Finalización:', 110, 110);
    doc.text(formatTime(remision.horaFinalizacion), 145, 110);
    
    doc.text('Ubicación Inicio:', 110, 120);
    const ubicInicioLines = doc.splitTextToSize(formatLocation(remision.ubicacionInicio), 50);
    doc.text(ubicInicioLines, 145, 120);
    
    doc.text('Ubicación Fin:', 110, 130);
    const ubicFinLines = doc.splitTextToSize(formatLocation(remision.ubicacionFin), 50);
    doc.text(ubicFinLines, 145, 130);
    
    // Calcular posición del precio según si hay servicios adicionales
    const hasAdditionalServices = remision.serviciosAdicionales && remision.serviciosAdicionales.length > 0;
    let precioY;
    
    if (hasAdditionalServices) {
        // Calcular la posición final de los servicios adicionales en formato de línea única
        const serviciosText = remision.serviciosAdicionales.map((servicio, index) => 
            `${index + 1}. ${servicio.codigo} - ${servicio.tipo}`
        ).join(' ');
        
        const serviciosLines = doc.splitTextToSize(serviciosText, 50);
        let finalY = 130 + (serviciosLines.length * 4) + 5; // Posición después de servicios adicionales
        
        // Ubicación después de servicios adicionales
        const ubicLines = doc.splitTextToSize(remision.ubicacion, 50);
        finalY += ubicLines.length * 4 + 5; // Espacio para ubicación
        precioY = finalY + 5; // Espacio antes del precio
    } else {
        precioY = 145;
    }
    
    // Precio en negrilla, más grande y centrado
    doc.setFont('helvetica', 'bold'); // Negrilla para Precio
    doc.setFontSize(14); // Más grande
    doc.text(`Precio: $${remision.precio.toLocaleString()}`, 105, precioY, { align: 'center' }); // Posición dinámica
    doc.setFont('helvetica', 'normal'); // Volver a normal
    doc.setFontSize(10); // Volver al tamaño normal
    
    // Línea separadora después del precio
    const lineaSeparadoraY = precioY + 5;
    doc.line(20, lineaSeparadoraY, 190, lineaSeparadoraY);
    
    // Sección de fotografía de evidencia (entre las dos líneas)
    if (remision.fotoEvidencia) {
        try {
            // Título de la sección
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('FOTOGRAFÍA DE EVIDENCIA:', 20, lineaSeparadoraY + 5);
            doc.setFont('helvetica', 'normal');
            
            // Agregar la imagen de evidencia
            const imgWidth = 60; // Ancho de la imagen en mm
            const imgHeight = 40; // Alto de la imagen en mm (reducido)
            const imgX = 20; // Posición X
            const imgY = lineaSeparadoraY + 10; // Posición Y después del título
            
            doc.addImage(remision.fotoEvidencia, 'JPEG', imgX, imgY, imgWidth, imgHeight);
            
            // Línea separadora antes de las firmas
            const lineaFirmasY = imgY + imgHeight + 5;
            doc.line(20, lineaFirmasY, 190, lineaFirmasY);
            
            // Sección de firmas
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold'); // Negrilla para FIRMAS
            doc.text('FIRMAS:', 20, lineaFirmasY + 5);
            doc.setFont('helvetica', 'normal'); // Volver a normal
            
        } catch (e) {
            console.log('Error al agregar fotografía de evidencia:', e);
            // Si falla la imagen, mostrar solo las líneas y firmas
            const lineaFirmasY = lineaSeparadoraY + 15;
            doc.line(20, lineaFirmasY, 190, lineaFirmasY);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold'); // Negrilla para FIRMAS
            doc.text('FIRMAS:', 20, lineaFirmasY + 5);
            doc.setFont('helvetica', 'normal'); // Volver a normal
        }
    } else {
        // Sin foto, línea separadora antes de las firmas
        const lineaFirmasY = lineaSeparadoraY + 15;
        doc.line(20, lineaFirmasY, 190, lineaFirmasY);
        
        // Sección de firmas
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold'); // Negrilla para FIRMAS
        doc.text('FIRMAS:', 20, lineaFirmasY + 5);
        doc.setFont('helvetica', 'normal'); // Volver a normal
    }
    
    // Determinar posiciones de firmas según si hay foto o no
    let firmaY, infoY;
    
    if (remision.fotoEvidencia) {
        // Con foto: las firmas van después de la foto
        const imgY = lineaSeparadoraY + 10;
        const imgHeight = 40;
        const lineaFirmasY = imgY + imgHeight + 5;
        firmaY = lineaFirmasY + 15;
        infoY = firmaY + 25;
    } else {
        // Sin foto: las firmas van después de la línea separadora
        const lineaFirmasY = lineaSeparadoraY + 15;
        firmaY = lineaFirmasY + 15;
        infoY = firmaY + 25;
    }
    
    // Firma del técnico
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold'); // Negrilla para Firma Técnico
    doc.text('Firma Técnico:', 20, firmaY);
    doc.setFont('helvetica', 'normal'); // Volver a normal
    doc.rect(20, firmaY + 5, 50, 15); // Marco para firma aún más pequeño
    
    // Agregar firma del técnico si existe
    if (remision.firmaTecnico) {
        try {
            doc.addImage(remision.firmaTecnico, 'PNG', 22, firmaY + 7, 46, 11); // Firma aún más pequeña
        } catch (e) {
            console.log('Error al agregar firma del técnico:', e);
        }
    }
    
    // Firma del cliente
    doc.setFont('helvetica', 'bold'); // Negrilla para Firma Cliente
    doc.text('Firma Cliente:', 120, firmaY);
    doc.setFont('helvetica', 'normal'); // Volver a normal
    doc.rect(120, firmaY + 5, 50, 15); // Marco para firma aún más pequeño
    
    // Agregar firma del cliente si existe
    if (remision.firmaCliente) {
        try {
            doc.addImage(remision.firmaCliente, 'PNG', 122, firmaY + 7, 46, 11); // Firma aún más pequeña
        } catch (e) {
            console.log('Error al agregar firma del cliente:', e);
        }
    }
    
    // Calcular la posición final del contenido para colocar el pie de página en la parte inferior
    const pageHeight = 297; // Altura de una página A4 en mm
    const marginBottom = 15; // Margen inferior
    
    // Calcular la posición final del contenido actual
    let finalContentY = infoY + 25; // Posición después de las firmas
    
    // Si hay fotografía, ajustar la posición
    if (remision.fotoEvidencia) {
        const imgY = lineaSeparadoraY + 10;
        const imgHeight = 40;
        const lineaFirmasY = imgY + imgHeight + 5;
        finalContentY = lineaFirmasY + 35; // Posición después de las firmas con foto
    }
    
    // Calcular la posición del pie de página en la parte inferior
    const piePaginaY = pageHeight - marginBottom;
    
    // Información adicional en la parte inferior fija
    doc.setFontSize(8);
    doc.text('Este documento es una remisión oficial de CONSEGUR S.A.S.', 105, piePaginaY - 5, { align: 'center' });
    doc.text('Para cualquier consulta comunicarse al teléfono 448 86 00', 105, piePaginaY, { align: 'center' });
    
    // Guardar el PDF
    doc.save(`remision_${remision.id}.pdf`);
}

// Función para calcular la altura necesaria para el texto dividido
function calculateTextHeight(text, maxWidth) {
    if (!text) return 0;
    
    // Simular el cálculo de líneas que haría jsPDF
    const words = text.split(' ');
    let lines = 1;
    let currentLine = '';
    
    for (let word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if (testLine.length * 3 > maxWidth) { // Aproximación del ancho de caracteres
            lines++;
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    
    return lines * 5; // 5mm por línea aproximadamente
}



// --- Signature Pad Logic ---

function initializeSignaturePads() {
    console.log('initializeSignaturePads llamado');
    
    const canvasClient = document.getElementById('signature-pad-client');
    const canvasTechnician = document.getElementById('signature-pad-technician');
    
    console.log('Canvas client encontrado:', canvasClient);
    console.log('Canvas technician encontrado:', canvasTechnician);
    console.log('SignaturePad disponible:', typeof SignaturePad !== 'undefined');

    if (canvasClient && typeof SignaturePad !== 'undefined') {
        try {
            if (signaturePadClient) signaturePadClient.off(); // Detach existing event listeners
            signaturePadClient = new SignaturePad(canvasClient, {
                backgroundColor: 'rgb(255, 255, 255)'
            });
            resizeCanvas(canvasClient, signaturePadClient);
            console.log('SignaturePad client inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar SignaturePad client:', error);
        }
    } else {
        console.warn('No se pudo inicializar SignaturePad client - canvas o librería no disponible');
    }

    if (canvasTechnician && typeof SignaturePad !== 'undefined') {
        try {
            if (signaturePadTechnician) signaturePadTechnician.off(); // Detach existing event listeners
            signaturePadTechnician = new SignaturePad(canvasTechnician, {
                backgroundColor: 'rgb(255, 255, 255)'
            });
            resizeCanvas(canvasTechnician, signaturePadTechnician);
            console.log('SignaturePad technician inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar SignaturePad technician:', error);
        }
    } else {
        console.warn('No se pudo inicializar SignaturePad technician - canvas o librería no disponible');
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
    
    // Inicializar protecciones de seguridad
    initializeSecurityProtections();
    
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
            
            // Limpiar checkboxes de tipo de servicio
            setServiceTypes('');

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
            // Habilitar checkboxes de tipo de servicio (si existen)
            const serviceTypeCajas = document.getElementById('service-type-cajas');
            const serviceTypeCamaras = document.getElementById('service-type-camaras');
            const serviceTypePuertas = document.getElementById('service-type-puertas');
            
            if (serviceTypeCajas) serviceTypeCajas.disabled = false;
            if (serviceTypeCamaras) serviceTypeCamaras.disabled = false;
            if (serviceTypePuertas) serviceTypePuertas.disabled = false;
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

// Función para probar la geolocalización mejorada


function testGeolocation() {
    console.log('🌍 Iniciando test de geolocalización mejorada');
    
    // Usar la instancia global de geolocalización
    if (!window.globalGeolocation) {
        window.globalGeolocation = new EnhancedGeolocation();
    }
    
    showAlert('🌍 Probando sistema de geolocalización mejorado...\n\nPor favor espera mientras obtenemos tu ubicación GPS.');
    
    window.globalGeolocation.getQuickLocation(
        (locationData) => {
            // Éxito: mostrar información detallada
            const displayInfo = window.globalGeolocation.formatLocationForDisplay(locationData);
            
            let message = `✅ Sistema de geolocalización funcionando correctamente!\n\n`;
            message += `📍 Ubicación obtenida:\n`;
            message += `Coordenadas: ${displayInfo.coordinates}\n`;
            message += `Precisión: ${displayInfo.accuracy}\n`;
            message += `Dirección: ${displayInfo.direction}\n`;
            message += `Velocidad: ${displayInfo.speed}\n`;
            message += `Altitud: ${displayInfo.altitude}\n`;
            message += `Navegador: ${displayInfo.browser}\n`;
            message += `Timestamp: ${displayInfo.timestamp}\n\n`;
            message += `🌐 Verificar en Google Maps:\n`;
            message += `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}\n\n`;
            message += `🎯 El sistema de geolocalización mejorado está funcionando correctamente y es compatible con tu navegador.`;

            console.log('Test de geolocalización mejorada exitoso:', locationData);
            
            // Cerrar el modal actual y mostrar el resultado
            const currentModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
            if (currentModal) {
                currentModal.hide();
            }
            
            // Mostrar el resultado después de un breve delay
            setTimeout(() => {
                console.log('Mostrando resultado de geolocalización mejorada');
                showAlert(message);
            }, 300);
        },
        (error) => {
            // Error: mostrar mensaje específico
            console.error('Error en prueba de geolocalización mejorada:', error);
            
            let errorMessage = `❌ Error en sistema de geolocalización:\n\n`;
            errorMessage += `${error.message}\n\n`;
            errorMessage += `${error.details || ''}\n\n`;
            errorMessage += `🔧 Soluciones:\n`;
            errorMessage += `• Verifica que el GPS esté activado\n`;
            errorMessage += `• Permite el acceso a la ubicación en tu navegador\n`;
            errorMessage += `• Asegúrate de tener conexión a internet\n`;
            errorMessage += `• Intenta en un área con mejor señal GPS\n\n`;
            errorMessage += `Navegador detectado: ${navigator.userAgent}`;
            
            // Cerrar el modal actual y mostrar el error
            const currentModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
            if (currentModal) {
                currentModal.hide();
            }
            
            setTimeout(() => {
                showAlert(errorMessage);
            }, 300);
                },
        'prueba_sistema'
    );
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

// Función para actualizar los contadores de filtros del técnico
function updateEmployeeFilterCounts() {
    if (!currentUser || currentUser.role !== 'employee') return;
    
    // Obtener servicios asignados al técnico actual
    const assignedToMe = services.filter(s => s.technicianId === currentUser.id);
    
    // Calcular cantidades por estado
    const counts = {
        todos: assignedToMe.length,
        pendiente: assignedToMe.filter(s => s.status === 'Pendiente').length,
        'en-proceso': assignedToMe.filter(s => s.status === 'En proceso').length,
        finalizado: assignedToMe.filter(s => s.status === 'Finalizado').length,
        cancelado: assignedToMe.filter(s => s.status === 'Cancelado').length
    };
    
    // Actualizar los badges
    const badgeIds = {
        'todos': 'filter-count-todos',
        'pendiente': 'filter-count-pendiente',
        'en-proceso': 'filter-count-en-proceso',
        'finalizado': 'filter-count-finalizado',
        'cancelado': 'filter-count-cancelado'
    };
    
    Object.keys(counts).forEach(key => {
        const badgeElement = document.getElementById(badgeIds[key]);
        if (badgeElement) {
            badgeElement.textContent = counts[key];
            
            // Agregar animación si hay servicios
            if (counts[key] > 0) {
                badgeElement.style.animation = 'badge-pulse-green 2s ease-in-out';
                setTimeout(() => {
                    badgeElement.style.animation = '';
                }, 2000);
            }
        }
    });
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

// ===== FUNCIONES DE BLOQUEO DE ACCESO =====

// Función para bloquear click derecho
function blockRightClick(e) {
    e.preventDefault();
    return false;
}

// Función para bloquear atajos de teclado
function blockKeyboardShortcuts(e) {
    // Bloquear Ctrl+U (ver código fuente)
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
    }
    
    // Bloquear Ctrl+Shift+I (herramientas de desarrollador)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
    }
    
    // Bloquear F12
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    
    // Bloquear Ctrl+Shift+C (inspeccionar elemento)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
    }
    
    // Bloquear Ctrl+Shift+J (consola)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
    }
    
    // Bloquear Ctrl+Shift+K (consola web)
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        return false;
    }
}

// Función para bloquear Fn+F12 (específico para algunos teclados)
function blockFunctionKeys(e) {
    // Bloquear F12
    if (e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
}

// Función para inicializar todas las protecciones
function initializeSecurityProtections() {
    // Bloquear click derecho
    document.addEventListener('contextmenu', blockRightClick);
    
    // Bloquear atajos de teclado
    document.addEventListener('keydown', blockKeyboardShortcuts);
    document.addEventListener('keydown', blockFunctionKeys);
    
    // Bloquear también en el body y html
    document.body.addEventListener('contextmenu', blockRightClick);
    document.body.addEventListener('keydown', blockKeyboardShortcuts);
    document.body.addEventListener('keydown', blockFunctionKeys);
    
    // Bloquear inspección de elementos
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Bloquear arrastrar elementos
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
}

// Event listeners para los nuevos módulos
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners para importación de archivos
    document.getElementById('import-services-file').addEventListener('change', handleServicesImport);
    document.getElementById('import-costo-servicios-file').addEventListener('change', handleCostoServiciosImport);
    
    // Event listener para poblar automáticamente tipo y descripción cuando cambie el código de servicio
    document.getElementById('service-code').addEventListener('change', loadServiceDetails);
    
    // Event listener para el formulario de costo de servicios
    document.getElementById('costo-servicio-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const editId = document.getElementById('edit-costo-servicio-id').value;
        const tipo = document.getElementById('costo-servicio-tipo').value;
        const otroTipo = document.getElementById('costo-servicio-otro-tipo').value;
        const descripcion = document.getElementById('costo-servicio-descripcion').value;
        const precio = parseFloat(document.getElementById('costo-servicio-precio').value);
        
        // Validar campos obligatorios
        if (!tipo.trim()) {
            showAlert('Por favor ingresa el tipo de servicio');
            return;
        }
        if (tipo === 'Otro' && !otroTipo.trim()) {
            showAlert('Por favor especifica el tipo de servicio personalizado');
            return;
        }
        if (!descripcion.trim()) {
            showAlert('Por favor ingresa la descripción del servicio');
            return;
        }
        if (isNaN(precio) || precio < 0) {
            showAlert('Por favor ingresa un precio válido mayor o igual a 0');
            return;
        }
        
        // Determinar el tipo final (usar el personalizado si se seleccionó "Otro")
        const tipoFinal = tipo === 'Otro' ? otroTipo.trim() : tipo.trim();
        
        if (editId) {
            // Editar servicio existente
            const index = costoServicios.findIndex(s => s.id === editId);
            if (index !== -1) {
                costoServicios[index] = {
                    ...costoServicios[index],
                    tipo: tipoFinal,
                    descripcion: descripcion.trim(),
                    precio: precio
                    // Mantener la fecha existente
                };
                console.log('✅ Servicio actualizado:', costoServicios[index]);
            }
        } else {
            // Crear nuevo servicio con código automático
            const codigoGenerado = generateCostoServicioCode();
            const fechaActual = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
            const newServicio = {
                id: generateId(),
                codigo: codigoGenerado,
                fecha: fechaActual,
                tipo: tipoFinal,
                descripcion: descripcion.trim(),
                precio: precio
            };
            costoServicios.push(newServicio);
            console.log('✅ Nuevo servicio creado:', newServicio);
        }
        
        saveCostoServicios();
        renderCostoServiciosList();
        populateServiceCodes();
        
        // Cerrar modal y limpiar formulario
        const modal = bootstrap.Modal.getInstance(document.getElementById('createCostoServicioModal'));
        modal.hide();
        document.getElementById('costo-servicio-form').reset();
        document.getElementById('edit-costo-servicio-id').value = '';
        
        // Limpiar y configurar el campo de código
        document.getElementById('costo-servicio-codigo').value = '';
        document.getElementById('costo-servicio-codigo').readOnly = true;
        
        // Ocultar el campo de tipo personalizado
        document.getElementById('otro-tipo-container').classList.add('d-none');
        
        // showAlert('Servicio guardado exitosamente'); // Comentado para eliminar alerta al guardar
    });
    
    // Event listener para el formulario de generar remisión
    document.getElementById('generate-remision-form').addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('🔄 Formulario de generar remisión enviado');
        
        try {
            const serviceId = document.getElementById('remision-service-id').value;
            console.log('🔍 Service ID seleccionado:', serviceId);
            
            if (!serviceId || serviceId.trim() === '') {
                console.error('❌ No se seleccionó ningún servicio');
                showAlert('Por favor seleccione un servicio para generar la remisión');
                return;
            }
            
            console.log('✅ Service ID válido, creando remisión...');
            createRemisionFromService(serviceId);
            
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('generateRemisionModal'));
            if (modal) {
                modal.hide();
                console.log('✅ Modal cerrado');
            } else {
                console.warn('⚠️ No se pudo cerrar el modal');
            }
            
            document.getElementById('generate-remision-form').reset();
            console.log('✅ Formulario limpiado');
            
        } catch (error) {
            console.error('❌ Error en el evento submit del formulario de remisión:', error);
            showAlert('❌ Error al procesar la solicitud. Por favor, intente nuevamente.');
        }
    });
    
    // Event listener para cargar códigos de servicio cuando se abre el modal
    document.getElementById('registerServiceModal').addEventListener('show.bs.modal', function() {
        // Solo poblar códigos si no estamos editando (no hay ID de edición)
        const editId = document.getElementById('edit-service-id').value;
        
        if (!editId) {
            // Es un nuevo servicio, limpiar formulario y poblar códigos
            clearServiceForm();
            populateServiceCodes();
            console.log('✅ Modal abierto para crear nuevo servicio');
        } else {
            console.log('✅ Modal abierto para editar servicio con ID:', editId);
        }
    });
    
    // Event listener para el modal de crear costo servicio
    document.getElementById('createCostoServicioModal').addEventListener('show.bs.modal', function() {
        // Solo limpiar si no estamos editando (no hay ID de edición)
        const editId = document.getElementById('edit-costo-servicio-id').value;
        
        if (!editId) {
            // Es un nuevo servicio, limpiar formulario
            document.getElementById('costo-servicio-form').reset();
            
            // Configurar el campo de código para nuevos servicios
            document.getElementById('costo-servicio-codigo').value = '';
            document.getElementById('costo-servicio-codigo').readOnly = true;
            document.getElementById('costo-servicio-codigo').style.backgroundColor = '#f8f9fa';
            document.getElementById('costo-servicio-codigo').placeholder = 'Se generará automáticamente';
            
            // Ocultar el campo de tipo personalizado
            document.getElementById('otro-tipo-container').classList.add('d-none');
            document.getElementById('costo-servicio-otro-tipo').value = '';
            
            console.log('✅ Modal abierto para crear nuevo servicio');
        } else {
            console.log('✅ Modal abierto para editar servicio con ID:', editId);
        }
    });
    
    // Event listener para el formulario de servicios (modificado)
    document.getElementById('service-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const date = document.getElementById('service-date').value;
        const serviceTime = document.getElementById('service-time').value;
        const serviceCode = document.getElementById('service-code').value;
        let safeType = document.getElementById('service-type').value;
        let description = document.getElementById('service-description').value;
        const location = document.getElementById('service-location').value;
        const clientName = document.getElementById('service-client-name').value;
        const clientPhone = document.getElementById('service-client-phone').value;
        const status = document.getElementById('service-status').value;
        
        // Obtener siempre los datos del código de servicio seleccionado para garantizar sincronización
        console.log('=== Obteniendo datos del formulario ===');
        console.log('Código de servicio seleccionado:', serviceCode);
        console.log('Tipo de servicio en formulario:', safeType);
        console.log('Descripción en formulario:', description);
        
        // Validar que se haya seleccionado un código de servicio
        if (!serviceCode || serviceCode.trim() === '') {
            showAlert('Por favor selecciona un código de servicio');
            return;
        }
        
        const servicio = costoServicios.find(s => s.codigo === serviceCode);
        console.log('Buscando en costoServicios:', costoServicios);
        console.log('Servicio encontrado:', servicio);
        
        if (servicio) {
            safeType = servicio.tipo;
            description = servicio.descripcion;
            console.log('✅ Datos sincronizados del código de servicio:', serviceCode);
            console.log('   Tipo de servicio:', safeType);
            console.log('   Descripción:', description);
        } else {
            console.log('❌ No se encontró servicio con código:', serviceCode);
            console.log('CostoServicios disponibles:', costoServicios.map(s => ({codigo: s.codigo, tipo: s.tipo})));
            showAlert('El código de servicio seleccionado no existe en la base de datos');
            return;
        }
        console.log('=== Fin obtención de datos ===');
        
        // Validar que se haya ingresado la ubicación
        if (!location.trim()) {
            showAlert('Por favor ingresa la ubicación del servicio');
            return;
        }

        // Handle required fields for Finalizado status for technician
        if (status === 'Finalizado' && currentUser.role === 'employee') {
            let missingFields = [];
            
            // Verificar foto de evidencia
            const photoInput = document.getElementById('service-photo');
            const photoPreview = document.getElementById('service-photo-preview');
            const hasPhoto = photoInput.files.length > 0 || (photoPreview.src && photoPreview.src !== 'data:,' && !photoPreview.classList.contains('d-none'));
            
            if (!hasPhoto) {
                missingFields.push('foto de evidencia');
            }
            
            // Verificar firma del cliente
            if (signaturePadClient && signaturePadClient.isEmpty()) {
                missingFields.push('firma del cliente');
            }
            
            // Verificar firma del técnico
            if (signaturePadTechnician && signaturePadTechnician.isEmpty()) {
                missingFields.push('firma del técnico');
            }

            if (missingFields.length > 0) {
                console.log('❌ Campos faltantes para finalizar servicio:', missingFields);
                console.log('📸 Estado de foto:', { 
                    hasFiles: photoInput.files.length > 0, 
                    hasPreview: photoPreview.src && photoPreview.src !== 'data:,', 
                    isHidden: photoPreview.classList.contains('d-none') 
                });
                showAlert(`Para finalizar el servicio, por favor proporcione: ${missingFields.join(', ')}.`);
                return; // Prevent form submission
            }
            
            console.log('✅ Todos los campos requeridos están completos para finalizar el servicio');
        }
        
        // Obtener datos de foto si existe
        const photoInput = document.getElementById('service-photo');
        let photoData = '';
        
        if (photoInput.files.length > 0) {
            const file = photoInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                photoData = e.target.result;
                saveServiceData(document.getElementById('edit-service-id').value, date, serviceTime, safeType, description, location, clientName, clientPhone, status, photoData);
            };
            reader.readAsDataURL(file);
        } else {
            saveServiceData(document.getElementById('edit-service-id').value, date, serviceTime, safeType, description, location, clientName, clientPhone, status, photoData);
        }
    });
});

// Inicialización de los nuevos módulos cuando se muestra el dashboard de administrador
function initializeAdminModules() {
    renderCostoServiciosList();
    renderRemisionesList();
    populateServiceCodes();
}

// Verificar compatibilidad de geolocalización al cargar la página
if (window.initializeGeolocation) {
    window.initializeGeolocation().then(result => {
        console.log('🌍 Estado de geolocalización:', result);
        if (!result.supported) {
            console.warn('⚠️ Geolocalización no soportada en este navegador');
        }
    }).catch(error => {
        console.warn('⚠️ Error al inicializar geolocalización:', error);
    });
}