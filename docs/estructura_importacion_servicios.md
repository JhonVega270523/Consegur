# Estructura para Importación de Servicios desde Excel

## Campos Requeridos

El archivo Excel debe contener las siguientes columnas con los nombres exactos:

| Nombre de Columna | Requerido | Descripción | Ejemplo |
|-------------------|-----------|-------------|---------|
| **Fecha** | ✅ Obligatorio | Fecha del servicio | 2024-01-15 |
| **Nombre del Cliente** | ✅ Obligatorio | Nombre completo del cliente | Juan Pérez |
| **Código de Servicio** | ✅ Obligatorio | Código del servicio (debe existir en el módulo Costo Servicios) | CS001 |

## Campos Opcionales

| Nombre de Columna | Requerido | Descripción | Ejemplo |
|-------------------|-----------|-------------|---------|
| **Ubicación** | ❌ Opcional | Dirección del servicio | Calle 123 #45-67 |
| **Teléfono del Cliente** | ❌ Opcional | Teléfono del cliente | 3001234567 |
| **Estado** | ❌ Opcional | Estado inicial del servicio | Pendiente |

## Notas Importantes

1. **Código de Servicio**: Debe existir previamente en el módulo "Costo Servicios". Si existe, automáticamente se llenarán los campos "Tipo de Servicio" y "Descripción" basándose en ese código.

2. **Tipo de Servicio y Descripción**: Si el código de servicio existe en "Costo Servicios", estos campos se llenan automáticamente. Si no existe, puedes incluirlos manualmente en el Excel.

3. **Estado**: Si no se especifica, por defecto será "Pendiente"

4. **Formato de Fecha**: Se recomienda usar formato YYYY-MM-DD

## Ejemplo de Archivo Excel

| Fecha | Nombre del Cliente | Código de Servicio | Ubicación | Teléfono del Cliente | Estado |
|-------|-------------------|-------------------|-----------|---------------------|--------|
| 2024-01-15 | Juan Pérez | CS001 | Calle 123 #45-67 | 3001234567 | Pendiente |
| 2024-01-16 | María García | CS002 | Carrera 78 #90-12 | 3109876543 | Pendiente |
| 2024-01-17 | Carlos López | CS003 | Avenida 5 #23-45 | 3155555555 | Pendiente |

## Proceso de Importación

1. Preparar el archivo Excel con la estructura descrita
2. Ir al módulo "Servicios" en el panel de administración
3. Hacer clic en "Importar Servicios desde Excel"
4. Seleccionar el archivo Excel
5. El sistema validará y procesará cada fila
6. Se mostrará un resumen de servicios importados y errores encontrados

## Validaciones del Sistema

- Verifica que los campos obligatorios estén presentes
- Valida que el código de servicio exista en "Costo Servicios"
- Genera IDs únicos automáticamente para cada servicio
- Maneja errores por fila sin detener todo el proceso
- Muestra un resumen detallado de la importación 