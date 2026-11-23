# JaguarX Client

Launcher de escritorio para Minecraft Java, creado con Electron.

## Funciones del proyecto
- Perfiles locales con versión, loader y RAM.
- Gestión de mods `.jar` por perfil.
- Carpetas separadas por perfil.
- Preferencias locales de rendimiento, HUD y cosméticos.
- Integración inicial con `minecraft-java-core` para autenticación Microsoft, descarga de archivos del juego y runtime Java, y lanzamiento.
- Configuración para generar instalador Windows NSIS (`.exe`).

## Requisito previo importante: Microsoft Client ID
La autenticación Microsoft necesita que el desarrollador registre una aplicación y configure su Client ID. JaguarX no pide ni guarda la contraseña Microsoft. Pega el Client ID en el campo de la pantalla Inicio y pulsa **Iniciar sesión Microsoft**.

La API y el permiso de Microsoft pueden requerir configuración adicional y aprobación para acceder a los servicios de Minecraft. No se puede garantizar el inicio hasta probarlo con un Client ID autorizado y una cuenta propietaria de Minecraft Java.

## Instalar y ejecutar (Windows 10/11)
1. Instala Node.js 20 LTS o superior desde https://nodejs.org/.
2. Extrae el ZIP.
3. Abre PowerShell dentro de `JAGUARX-CLIENT`.
4. Ejecuta `npm install`.
5. Ejecuta `npm start`.

## Crear el instalador .exe
En Windows, dentro de la carpeta del proyecto, ejecuta:

```powershell
npm install
npm run dist
```

El instalador se generará en `dist/`. El ZIP fuente no contiene un `.exe` ya compilado.

## Versiones y loaders
El motor se encarga de obtener los archivos de la versión elegida y Java cuando sea necesario. La disponibilidad de loaders depende de la versión seleccionada y del soporte de `minecraft-java-core`.

## Aviso de licencia
La documentación de `minecraft-java-core` publica licencia CC BY-NC 4.0 (uso no comercial). Revisa sus condiciones antes de distribuir o monetizar JaguarX Client. Minecraft pertenece a Mojang/Microsoft. JaguarX Client no está afiliado ni respaldado por Mojang/Microsoft.

## Seguridad
No compartas tu contraseña Microsoft ni tokens de sesión. Inicia sesión únicamente en la ventana oficial del proveedor.
