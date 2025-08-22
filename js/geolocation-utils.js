/**
 * Utilidades de Geolocalización Mejorada
 * Compatible con Chrome, Firefox, Edge, Brave, Safari
 * Proporciona ubicaciones más precisas con múltiples métodos de fallback
 */

class EnhancedGeolocation {
    constructor() {
        this.isSupported = 'geolocation' in navigator;
        this.maxAttempts = 3; // Aumentado a 3 intentos para mayor precisión
        this.accuracyThreshold = 10; // Reducido a 10 metros para mayor precisión
        this.timeout = 30000; // Aumentado a 30 segundos para dar más tiempo
        this.maxAge = 60000; // Usar caché de hasta 1 minuto
        this.enableHighAccuracy = true; // Usar alta precisión por defecto
        this.isRequesting = false; // Flag para evitar múltiples solicitudes simultáneas
        this.lastLocation = null; // Cache de la última ubicación
        this.lastLocationTime = 0; // Timestamp de la última ubicación
        this.browserInfo = this.getBrowserInfo(); // Obtener información del navegador al inicializar
    }

    /**
     * Verifica si podemos usar una ubicación en caché
     */
    canUseCachedLocation() {
        if (!this.lastLocation || !this.lastLocationTime) {
            return false;
        }
        
        const now = Date.now();
        const timeDiff = now - this.lastLocationTime;
        const maxAgeMs = this.maxAge;
        
        // Usar caché si la ubicación tiene menos de 30 segundos
        return timeDiff < maxAgeMs;
    }

    /**
     * Obtiene ubicación rápida (usa caché si está disponible)
     * @param {Function} onSuccess - Callback cuando se obtiene ubicación exitosamente
     * @param {Function} onError - Callback cuando hay error
     * @param {string} context - Contexto para logging
     */
    getQuickLocation(onSuccess, onError, context = "servicio") {
        if (!this.isSupported) {
            onError({
                code: 2,
                message: 'Geolocalización no soportada en este navegador',
                details: 'Tu navegador no soporta la funcionalidad de geolocalización.'
            });
            return;
        }

        // Si tenemos una ubicación en caché válida, usarla inmediatamente
        if (this.canUseCachedLocation()) {
            console.log('⚡ Usando ubicación en caché (instantánea)');
            onSuccess(this.lastLocation);
            return;
        }

        // Si no hay caché, usar configuración optimizada por navegador
        console.log(`🚀 Obteniendo ubicación rápida para: ${context}`);
        
        const options = this.getOptimizedOptions('quick');
        console.log('🔧 Opciones optimizadas para navegador:', options);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('✅ Ubicación rápida obtenida:', {
                    accuracy: position.coords.accuracy,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    browser: this.browserInfo.name
                });
                this.processLocation(position, onSuccess, context);
            },
            (error) => {
                console.error('❌ Error en ubicación rápida:', error);
                
                // Manejar errores específicos con mensajes mejorados
                let errorMessage = 'No se pudo obtener la ubicación rápidamente.';
                let errorDetails = '';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Permiso de ubicación denegado.';
                        errorDetails = this.getPermissionInstructions();
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Información de ubicación no disponible.';
                        errorDetails = this.getPositionUnavailableInstructions();
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Tiempo de espera agotado.';
                        errorDetails = this.getTimeoutInstructions();
                        break;
                    default:
                        errorDetails = error.message || 'Error desconocido en el sistema de geolocalización.';
                }
                
                onError({
                    code: error.code,
                    message: errorMessage,
                    details: errorDetails
                });
            },
            options
        );
    }

    /**
     * Obtiene la ubicación con la máxima precisión posible
     * @param {Function} onSuccess - Callback cuando se obtiene ubicación exitosamente
     * @param {Function} onError - Callback cuando hay error
     * @param {string} context - Contexto para logging (ej: "inicio", "finalización")
     */
    getPreciseLocation(onSuccess, onError, context = "servicio") {
        if (!this.isSupported) {
            onError({
                code: 2,
                message: 'Geolocalización no soportada en este navegador'
            });
            return;
        }

        // Evitar múltiples solicitudes simultáneas
        if (this.isRequesting) {
            console.log('⚠️ Ya hay una solicitud de ubicación en curso, esperando...');
            setTimeout(() => this.getPreciseLocation(onSuccess, onError, context), 1000);
            return;
        }

        // Verificar si podemos usar caché
        if (this.canUseCachedLocation()) {
            console.log('⚡ Usando ubicación en caché (más rápida)');
            this.isRequesting = false;
            onSuccess(this.lastLocation);
            return;
        }

        this.isRequesting = true;
        console.log(`🌍 Iniciando obtención de ubicación para: ${context}`);
        
        // Configuración optimizada por navegador para alta precisión
        const options = this.getOptimizedOptions('precise');
        console.log('🎯 Opciones de alta precisión para navegador:', options);

        let attempts = 0;
        let bestPosition = null;
        let bestAccuracy = Infinity;

        const attemptLocation = () => {
            attempts++;
            console.log(`📍 Intento ${attempts}/${this.maxAttempts} - Obteniendo ubicación...`);

            // En el segundo intento, intentar con configuración más agresiva
            if (attempts === 2) {
                options.timeout = Math.min(options.timeout + 10000, 60000);
                console.log('🎯 Segundo intento con timeout extendido...');
            }
            
            // En el tercer intento, intentar con configuración más permisiva
            if (attempts === 3) {
                options.enableHighAccuracy = false;
                options.timeout = 45000;
                console.log('🎯 Tercer intento con precisión estándar...');
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log(`✅ Ubicación obtenida (intento ${attempts}):`, {
                        accuracy: position.coords.accuracy,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        timestamp: new Date(position.timestamp).toLocaleString()
                    });

                    // Guardar la mejor posición hasta ahora
                    if (position.coords.accuracy < bestAccuracy) {
                        bestPosition = position;
                        bestAccuracy = position.coords.accuracy;
                    }

                    // En el primer intento, solo aceptar si la precisión es muy buena
                    if (attempts === 1) {
                        if (position.coords.accuracy <= this.accuracyThreshold) {
                            console.log(`🎯 Precisión excelente en primer intento: ${position.coords.accuracy}m`);
                            this.processLocation(position, onSuccess, context);
                            return;
                        } else {
                            console.log(`📊 Precisión aceptable en primer intento: ${position.coords.accuracy}m, continuando...`);
                        }
                    }

                    // En el segundo intento, aceptar si es mejor que el primero
                    if (attempts === 2) {
                        if (position.coords.accuracy < bestAccuracy) {
                            console.log(`🎯 Mejor precisión en segundo intento: ${position.coords.accuracy}m`);
                            this.processLocation(position, onSuccess, context);
                        } else {
                            console.log(`📊 Usando mejor precisión disponible: ${bestAccuracy}m`);
                            this.processLocation(bestPosition, onSuccess, context);
                        }
                        return;
                    }
                    
                    // En el tercer intento, aceptar cualquier ubicación
                    if (attempts === 3) {
                        console.log(`🎯 Aceptando ubicación del tercer intento: ${position.coords.accuracy}m`);
                        this.processLocation(position, onSuccess, context);
                        return;
                    }
                },
                (error) => {
                    console.error(`❌ Error en intento ${attempts}:`, error);
                    
                    // Manejar errores específicos
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            this.isRequesting = false;
                            onError({
                                code: 1,
                                message: 'Permiso de ubicación denegado. Por favor, permite el acceso a la ubicación en tu navegador para continuar.',
                                details: 'El navegador requiere permiso explícito para acceder a la ubicación GPS.'
                            });
                            break;
                            
                        case error.POSITION_UNAVAILABLE:
                            if (attempts < this.maxAttempts) {
                                console.log('🔄 Información de ubicación temporalmente no disponible, reintentando...');
                                setTimeout(attemptLocation, 3000);
                            } else {
                                this.isRequesting = false;
                                onError({
                                    code: 2,
                                    message: 'No se pudo obtener la ubicación. Verifica que el GPS esté activado y que tengas conexión a internet.',
                                    details: this.getPositionUnavailableInstructions()
                                });
                            }
                            break;
                            
                        case error.TIMEOUT:
                            if (attempts < this.maxAttempts) {
                                console.log('⏱️ Timeout, reintentando con configuración más permisiva...');
                                setTimeout(attemptLocation, 2000);
                            } else {
                                this.isRequesting = false;
                                onError({
                                    code: 3,
                                    message: 'Tiempo de espera agotado. Verifica tu conexión a internet y GPS.',
                                    details: this.getTimeoutInstructions()
                                });
                            }
                            break;
                            
                        default:
                            this.isRequesting = false;
                            onError({
                                code: 0,
                                message: 'Error desconocido al obtener la ubicación.',
                                details: error.message || 'Error no identificado en el sistema de geolocalización.'
                            });
                    }
                },
                options
            );
        };

        // Iniciar el primer intento
        attemptLocation();
    }

    /**
     * Procesa y valida la ubicación obtenida
     */
    processLocation(position, onSuccess, context) {
        const coords = position.coords;
        const timestamp = new Date(position.timestamp);
        
        // Validar que las coordenadas sean válidas
        if (!this.isValidCoordinates(coords.latitude, coords.longitude)) {
            onError({
                code: 2,
                message: 'Las coordenadas obtenidas no son válidas.',
                details: 'Las coordenadas están fuera del rango válido.'
            });
            return;
        }

        // Crear objeto de ubicación enriquecido
        const locationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            timestamp: timestamp.toISOString(),
            altitude: coords.altitude || null,
            heading: coords.heading || null,
            speed: coords.speed || null,
            altitudeAccuracy: coords.altitudeAccuracy || null,
            context: context,
            browser: this.getBrowserInfo(),
            deviceInfo: this.getDeviceInfo()
        };

        // Guardar en caché para uso futuro
        this.lastLocation = locationData;
        this.lastLocationTime = Date.now();

        console.log(`🎉 Ubicación procesada exitosamente para ${context}:`, locationData);
        this.isRequesting = false;
        onSuccess(locationData);
    }

    /**
     * Valida que las coordenadas sean válidas
     */
    isValidCoordinates(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    /**
     * Obtiene información del navegador
     */
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';
        
        // Detección más precisa del navegador
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            browser = 'Chrome';
            const match = userAgent.match(/Chrome\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            const match = userAgent.match(/Firefox\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browser = 'Safari';
            const match = userAgent.match(/Version\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Edg')) {
            browser = 'Edge';
            const match = userAgent.match(/Edg\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Brave')) {
            browser = 'Brave';
            const match = userAgent.match(/Chrome\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
            browser = 'Opera';
            const match = userAgent.match(/(?:Opera|OPR)\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        }
        
        return {
            name: browser,
            version: version,
            userAgent: userAgent,
            language: navigator.language,
            platform: navigator.platform,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
        };
    }

    /**
     * Obtiene información del dispositivo
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }

    /**
     * Verifica el estado de los permisos de ubicación
     * Compatible con todos los navegadores
     */
    async checkLocationPermission() {
        if (!this.isSupported) {
            return { granted: false, reason: 'Geolocalización no soportada' };
        }

        try {
            // Método moderno (Chrome, Firefox, Safari, Edge)
            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'geolocation' });
                return {
                    granted: permission.state === 'granted',
                    denied: permission.state === 'denied',
                    prompt: permission.state === 'prompt',
                    state: permission.state
                };
            }
            
            // Fallback para navegadores que no soportan permissions API
            return { granted: 'unknown', reason: 'No se puede verificar el estado del permiso' };
        } catch (error) {
            console.warn('Error al verificar permisos:', error);
            return { granted: 'unknown', reason: 'Error al verificar permisos' };
        }
    }

    /**
     * Solicita permisos de ubicación de manera compatible
     */
    async requestLocationPermission() {
        if (!this.isSupported) {
            throw new Error('Geolocalización no soportada en este navegador');
        }

        return new Promise((resolve, reject) => {
            // Usar una solicitud de ubicación simple para activar el prompt de permisos
            const options = {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        granted: true,
                        message: 'Permiso de ubicación concedido',
                        position: position
                    });
                },
                (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                        reject({
                            granted: false,
                            message: 'Permiso de ubicación denegado',
                            details: this.getPermissionInstructions()
                        });
                    } else {
                        reject({
                            granted: false,
                            message: 'Error al solicitar ubicación',
                            details: error.message
                        });
                    }
                },
                options
            );
        });
    }

    /**
     * Fuerza la solicitud de permisos en navegadores problemáticos
     */
    async forcePermissionRequest() {
        if (!this.isSupported) {
            throw new Error('Geolocalización no soportada en este navegador');
        }

        const browser = this.browserInfo.name;
        console.log(`🔧 Forzando solicitud de permisos para ${browser}`);

        // Estrategias específicas por navegador
        const strategies = {
            Firefox: () => this.forceFirefoxPermission(),
            Safari: () => this.forceSafariPermission(),
            Edge: () => this.forceEdgePermission(),
            default: () => this.forceGenericPermission()
        };

        const strategy = strategies[browser] || strategies.default;
        return strategy.call(this);
    }

    /**
     * Estrategia específica para Firefox
     */
    async forceFirefoxPermission() {
        return new Promise((resolve, reject) => {
            // Firefox a veces necesita múltiples intentos
            let attempts = 0;
            const maxAttempts = 3;

            const tryGetPosition = () => {
                attempts++;
                console.log(`🦊 Intento ${attempts} para Firefox`);

                const options = {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 0
                };

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            granted: true,
                            message: 'Permiso concedido en Firefox',
                            position: position,
                            attempts: attempts
                        });
                    },
                    (error) => {
                        if (error.code === error.PERMISSION_DENIED && attempts < maxAttempts) {
                            console.log('🔄 Reintentando en Firefox...');
                            setTimeout(tryGetPosition, 2000);
                        } else {
                            reject({
                                granted: false,
                                message: 'Permiso denegado en Firefox',
                                details: this.getPermissionInstructions(),
                                attempts: attempts
                            });
                        }
                    },
                    options
                );
            };

            tryGetPosition();
        });
    }

    /**
     * Estrategia específica para Safari
     */
    async forceSafariPermission() {
        return new Promise((resolve, reject) => {
            // Safari puede ser más lento
            const options = {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        granted: true,
                        message: 'Permiso concedido en Safari',
                        position: position
                    });
                },
                (error) => {
                    reject({
                        granted: false,
                        message: 'Permiso denegado en Safari',
                        details: this.getPermissionInstructions()
                    });
                },
                options
            );
        });
    }

    /**
     * Estrategia específica para Edge
     */
    async forceEdgePermission() {
        return new Promise((resolve, reject) => {
            const options = {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        granted: true,
                        message: 'Permiso concedido en Edge',
                        position: position
                    });
                },
                (error) => {
                    reject({
                        granted: false,
                        message: 'Permiso denegado en Edge',
                        details: this.getPermissionInstructions()
                    });
                },
                options
            );
        });
    }

    /**
     * Estrategia genérica para otros navegadores
     */
    async forceGenericPermission() {
        return this.requestLocationPermission();
    }

    /**
     * Obtiene opciones optimizadas según el navegador y tipo de solicitud
     */
    getOptimizedOptions(type = 'quick') {
        const browser = this.browserInfo.name;
        const isMobile = this.browserInfo.isMobile;
        
        // Configuraciones base por navegador
        const browserConfigs = {
            Chrome: {
                quick: { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
                precise: { enableHighAccuracy: true, timeout: 30000, maximumAge: 30000 }
            },
            Firefox: {
                quick: { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
                precise: { enableHighAccuracy: true, timeout: 35000, maximumAge: 30000 }
            },
            Safari: {
                quick: { enableHighAccuracy: true, timeout: 25000, maximumAge: 60000 },
                precise: { enableHighAccuracy: true, timeout: 40000, maximumAge: 30000 }
            },
            Edge: {
                quick: { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
                precise: { enableHighAccuracy: true, timeout: 30000, maximumAge: 30000 }
            },
            Opera: {
                quick: { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
                precise: { enableHighAccuracy: true, timeout: 30000, maximumAge: 30000 }
            }
        };
        
        // Obtener configuración del navegador o usar Chrome como fallback
        const config = browserConfigs[browser] || browserConfigs.Chrome;
        const options = config[type] || config.quick;
        
        // Ajustes adicionales para móviles
        if (isMobile) {
            options.timeout = Math.min(options.timeout + 10000, 60000); // Más tiempo en móviles
        }
        
        return options;
    }

    /**
     * Obtiene instrucciones específicas para cada navegador
     */
    getPermissionInstructions() {
        const browser = this.browserInfo.name;
        const isMobile = this.browserInfo.isMobile;

        const instructions = {
            Chrome: {
                desktop: '1. Haz clic en el ícono de ubicación en la barra de direcciones\n2. Selecciona "Permitir"\n3. Recarga la página',
                mobile: '1. Toca el ícono de ubicación en la barra de direcciones\n2. Selecciona "Permitir"\n3. Recarga la página'
            },
            Firefox: {
                desktop: '1. Haz clic en el ícono de ubicación en la barra de direcciones\n2. Selecciona "Permitir"\n3. Recarga la página',
                mobile: '1. Toca el ícono de ubicación en la barra de direcciones\n2. Selecciona "Permitir"\n3. Recarga la página'
            },
            Safari: {
                desktop: '1. Ve a Safari > Preferencias > Sitios web > Ubicación\n2. Selecciona "Permitir" para este sitio\n3. Recarga la página',
                mobile: '1. Ve a Ajustes > Safari > Ubicación\n2. Selecciona "Permitir"\n3. Recarga la página'
            },
            Edge: {
                desktop: '1. Haz clic en el ícono de ubicación en la barra de direcciones\n2. Selecciona "Permitir"\n3. Recarga la página',
                mobile: '1. Toca el ícono de ubicación en la barra de direcciones\n2. Selecciona "Permitir"\n3. Recarga la página'
            },
            Opera: {
                desktop: '1. Haz clic en el ícono de ubicación en la barra de direcciones\n2. Selecciona "Permitir"\n3. Recarga la página',
                mobile: '1. Toca el ícono de ubicación en la barra de direcciones\n2. Selecciona "Permitir"\n3. Recarga la página'
            }
        };

        const browserInstructions = instructions[browser] || instructions.Chrome;
        return isMobile ? browserInstructions.mobile : browserInstructions.desktop;
    }

    /**
     * Obtiene instrucciones específicas para error POSITION_UNAVAILABLE
     */
    getPositionUnavailableInstructions() {
        const browser = this.browserInfo.name;
        const isMobile = this.browserInfo.isMobile;
        
        let instructions = 'Verifica que el GPS esté activado y que tengas conexión a internet.\n\n';
        
        if (isMobile) {
            instructions += 'En dispositivos móviles:\n';
            instructions += '• Ve a Configuración > Ubicación y asegúrate de que esté activada\n';
            instructions += '• Verifica que la aplicación tenga permisos de ubicación\n';
            instructions += '• Intenta en un área abierta con mejor señal GPS\n';
        } else {
            instructions += 'En navegadores de escritorio:\n';
            instructions += '• Verifica tu conexión a internet\n';
            instructions += '• Asegúrate de que el sitio use HTTPS\n';
            instructions += '• Intenta recargar la página\n';
        }
        
        return instructions;
    }

    /**
     * Obtiene instrucciones específicas para error TIMEOUT
     */
    getTimeoutInstructions() {
        const browser = this.browserInfo.name;
        const isMobile = this.browserInfo.isMobile;
        
        let instructions = 'El navegador no pudo obtener la ubicación en el tiempo especificado.\n\n';
        
        if (isMobile) {
            instructions += 'En dispositivos móviles:\n';
            instructions += '• Mueve el dispositivo a un área abierta\n';
            instructions += '• Verifica que el GPS esté activado\n';
            instructions += '• Intenta cerca de una ventana o al aire libre\n';
            instructions += '• Verifica que no estés en modo avión\n';
        } else {
            instructions += 'En navegadores de escritorio:\n';
            instructions += '• Verifica tu conexión a internet\n';
            instructions += '• Intenta en una ubicación diferente\n';
            instructions += '• Verifica que el firewall no esté bloqueando la geolocalización\n';
        }
        
        return instructions;
    }

    /**
     * Calcula la distancia entre dos puntos en metros
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Radio de la Tierra en metros
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Obtiene la dirección cardinal aproximada
     */
    getCardinalDirection(heading) {
        if (heading === null || heading === undefined) return 'N/A';
        
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                           'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(heading / 22.5) % 16;
        return directions[index];
    }

    /**
     * Formatea la información de ubicación para mostrar al usuario
     */
    formatLocationForDisplay(locationData) {
        const accuracy = Math.round(locationData.accuracy);
        const direction = this.getCardinalDirection(locationData.heading);
        const speed = locationData.speed ? `${(locationData.speed * 3.6).toFixed(1)} km/h` : 'N/A';
        const altitude = locationData.altitude ? `${Math.round(locationData.altitude)}m` : 'N/A';
        
        return {
            coordinates: `${locationData.latitude.toFixed(8)}, ${locationData.longitude.toFixed(8)}`,
            accuracy: `±${accuracy} metros`,
            direction: direction,
            speed: speed,
            altitude: altitude,
            timestamp: new Date(locationData.timestamp).toLocaleString(),
            browser: locationData.browser.name
        };
    }
}

// Exportar la clase para uso global
window.EnhancedGeolocation = EnhancedGeolocation;

// Crear una instancia global para evitar múltiples solicitudes de permisos
window.globalGeolocation = new EnhancedGeolocation();

// Función de inicialización para verificar compatibilidad
window.initializeGeolocation = async function() {
    const geolocation = window.globalGeolocation;
    const browserInfo = geolocation.getBrowserInfo();
    
    console.log('🌍 Inicializando sistema de geolocalización...');
    console.log('📱 Información del navegador:', browserInfo);
    
    // Verificar soporte básico
    if (!geolocation.isSupported) {
        console.error('❌ Geolocalización no soportada en este navegador');
        return {
            supported: false,
            message: 'Tu navegador no soporta geolocalización',
            browser: browserInfo
        };
    }
    
    // Verificar permisos
    try {
        const permissionStatus = await geolocation.checkLocationPermission();
        console.log('🔐 Estado de permisos:', permissionStatus);
        
        return {
            supported: true,
            permissionStatus: permissionStatus,
            browser: browserInfo,
            message: 'Sistema de geolocalización inicializado correctamente'
        };
    } catch (error) {
        console.warn('⚠️ Error al verificar permisos:', error);
        return {
            supported: true,
            permissionStatus: { granted: 'unknown' },
            browser: browserInfo,
            message: 'Sistema inicializado (no se pudo verificar permisos)'
        };
    }
};

// Auto-inicializar cuando se carga el script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeGeolocation);
} else {
    window.initializeGeolocation();
}
