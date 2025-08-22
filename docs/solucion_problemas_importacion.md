# Solución de Problemas - Importación de Servicios desde Excel

## Estructura Requerida del Archivo Excel

### Columnas Obligatorias:
1. **Fecha** (o FECHA) - Formato: YYYY-MM-DD (ejemplo: 2024-01-15)
2. **Nombre del Cliente** (o NOMBRE DEL CLIENTE) - Nombre completo del cliente
3. **Código de Servicio** (o CODIGO DE SERVICIO) - Código que debe existir en el módulo "Costo Servicios"

### Columnas Opcionales:
4. **Ubicación** (o UBICACIÓN) - Dirección del servicio
5. **Teléfono del Cliente** (o TELEFONO DEL CLIENTE) - Número de contacto
6. **Estado** (o ESTADO) - Estado del servicio (por defecto: "Pendiente")

**Nota:** El sistema acepta tanto mayúsculas como minúsculas en los nombres de las columnas.

## Problemas Comunes y Soluciones

### 1. "Falta campo obligatorio"
**Problema:** El sistema no encuentra las columnas requeridas.
**Solución:** 
- Asegúrate de que las columnas se llamen exactamente: `Fecha`, `Nombre del Cliente`, `Código de Servicio`
- O en mayúsculas: `FECHA`, `NOMBRE DEL CLIENTE`, `CODIGO DE SERVICIO`
- Verifica que no haya espacios extra al inicio o final de los nombres de columnas

### 2. "Código de servicio no encontrado"
**Problema:** El código de servicio no existe en el módulo "Costo Servicios".
**Solución:**
- Primero crea el servicio en el módulo "Costo Servicios"
- Verifica que el código coincida exactamente (mayúsculas/minúsculas)
- Los códigos por defecto son: CS001, CS002, CS003

### 3. "Archivo Excel está vacío"
**Problema:** El archivo no contiene datos o está corrupto.
**Solución:**
- Asegúrate de que el archivo tenga al menos una fila de datos (sin contar el encabezado)
- Verifica que el archivo no esté dañado
- Intenta guardar el archivo como `.xlsx` o `.xls`

### 4. "Error al procesar fila"
**Problema:** Hay datos malformados en alguna fila.
**Solución:**
- Revisa que no haya caracteres especiales problemáticos
- Verifica que las fechas estén en formato válido
- Asegúrate de que no haya celdas vacías en columnas obligatorias

### 5. "Fechas aparecen como números (ej: 45876)"
**Problema:** Excel almacena las fechas como números seriales y no se están convirtiendo correctamente.
**Solución:**
- ✅ **PROBLEMA RESUELTO**: El sistema ahora convierte automáticamente las fechas seriales de Excel
- Las fechas como `45876` se convertirán automáticamente a `2025-08-07`
- El sistema maneja tanto fechas en formato texto como números seriales de Excel
- Puedes usar cualquier formato de fecha en tu Excel y se convertirá correctamente



## Ejemplo de Tabla Correcta

| Fecha | Nombre del Cliente | Código de Servicio | Ubicación | Teléfono del Cliente | Estado |
|-------|-------------------|-------------------|-----------|---------------------|--------|
| 2024-01-15 | Juan Pérez | CS001 | Calle 123 #45-67 | 3001234567 | Pendiente |
| 2024-01-16 | María García | CS002 | Carrera 78 #12-34 | 3109876543 | Pendiente |
| 2024-01-17 | Carlos López | CS003 | Avenida 5 #23-45 | 3155551234 | Pendiente |

**Nota sobre fechas:** Puedes usar cualquier formato de fecha en Excel:
- `2024-01-15` (formato texto)
- `45876` (número serial de Excel)
- `15/01/2024` (formato de fecha de Excel)

El sistema los convertirá automáticamente al formato correcto.

## Pasos para Importar Correctamente

1. **Preparar el archivo Excel:**
   - Usa las columnas exactas mencionadas arriba
   - Asegúrate de que los códigos de servicio existan en "Costo Servicios"
   - Las fechas pueden estar en cualquier formato (se convertirán automáticamente)

2. **Importar desde la interfaz:**
   - Ve al módulo "SERVICIOS"
   - Haz clic en "Importar Servicios desde Excel"
   - Selecciona tu archivo
   - Revisa los mensajes de éxito/error

3. **Verificar la importación:**
   - Los servicios aparecerán en la lista
   - Revisa que las fechas se muestren correctamente (formato YYYY-MM-DD)
   - Verifica que los tipos de servicio se hayan llenado automáticamente

## Códigos de Servicio por Defecto

Si no tienes servicios creados, el sistema crea automáticamente:

- **CS001**: Bovedas y cajas fuertes de seguridad - Instalación de caja fuerte residencial
- **CS002**: Puertas de seguridad - Instalación de puerta blindada  
- **CS003**: Pasatulas o tombolas - Mantenimiento de cerradura electrónica

## Información Técnica sobre Fechas

### ¿Por qué Excel muestra números como 45876?
- Excel almacena las fechas como números seriales que representan días desde el 1 de enero de 1900
- El número 45876 corresponde al 7 de agosto de 2025
- Excel tiene un bug conocido: considera 1900 como año bisiesto cuando no lo es

### ¿Cómo funciona la conversión automática?
- El sistema detecta automáticamente si la fecha es un número serial o texto
- Convierte los números seriales a fechas reales usando la fórmula correcta
- Corrige el bug de Excel restando 2 días en la conversión
- Formatea todas las fechas al formato estándar YYYY-MM-DD

## Soporte

Si continúas teniendo problemas:
1. Revisa la consola del navegador (F12) para ver errores detallados
2. Verifica que el formato de tu archivo coincida con el ejemplo
3. Asegúrate de que todos los códigos de servicio existan en "Costo Servicios"
4. Para probar la conversión de fechas, abre el archivo `test_conversion_fechas.html` 