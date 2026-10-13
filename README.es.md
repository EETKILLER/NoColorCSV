# NoColorCSV

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

NoColorCSV es una extensión de VS Code para personas con dificultades de percepción del color y para quienes no pueden distinguir fácilmente las columnas mediante colores. Muestra el número de columna, el encabezado y una vista previa del contenido de la celda, y permite navegar con el teclado.

## Así se ve en VS Code

Estas capturas muestran la extensión en funcionamiento con el [archivo de ejemplo](examples/sample.csv) incluido. La interfaz aparece en inglés; la extensión también ofrece textos localizados.

**Columna actual:** Al situar el cursor en `hello, world`, la barra de estado indica la columna 3 y su encabezado `note`.

![VS Code muestra el cursor en la tercera columna de un CSV y NoColorCSV indica la columna 3 y el encabezado note en la barra de estado](docs/images/column-status.png)

**Detalles de la celda:** Con el cursor en `London, UK`, al seleccionar el elemento de la barra de estado se muestran en texto la fila, la columna, el encabezado y el valor de la celda. La coma dentro del campo entre comillas no inicia otra columna.

![VS Code muestra los detalles de la celda London, UK de la columna 2 bajo el encabezado city](docs/images/cell-details.png)

## Diferencias con Rainbow CSV

[Rainbow CSV](https://github.com/mechatroner/vscode_rainbow_csv) resalta las columnas con colores distintos y también ofrece información en la barra de estado y al pasar el cursor, alineación y consultas. NoColorCSV se centra en la lectura de archivos CSV sin depender de la distinción entre colores.

| | NoColorCSV | Rainbow CSV |
| --- | --- | --- |
| Identificación de columnas | Número de columna, encabezado y vista previa de la celda en texto | Resaltado por color e información en la barra de estado y al pasar el cursor |
| Navegación con teclado | Desplazamiento entre columnas y por la misma columna en otras filas | Seguimiento de columnas y edición con varios cursores |
| Formatos | Archivos `.csv` separados por comas | CSV, TSV y otros formatos delimitados |
| Herramientas de datos | Lectura y ubicación de celdas | Alineación, CSVLint y consultas RBQL |

NoColorCSV no modifica el contenido del CSV ni añade colores a las columnas.

## Instalación

Descarga el archivo `.vsix` de la [versión más reciente](https://github.com/EETKILLER/NoColorCSV/releases/latest). En VS Code, abre **Extensiones**, selecciona `…` → **Instalar desde VSIX...** y elige el archivo descargado.

## Uso

Abre un archivo `.csv` y mueve el cursor. La barra de estado muestra el número de la columna actual, el total de columnas de esa fila y el encabezado, si existe. Selecciona el elemento de la barra de estado para ver los detalles de la celda. Los comandos también están disponibles en la paleta de comandos.

| Comando | Windows / Linux | macOS |
| --- | --- | --- |
| NoColorCSV: Mostrar columna actual | — | — |
| NoColorCSV: Ir a la columna siguiente | Ctrl+Alt+Shift+→ | Cmd+Alt+Shift+→ |
| NoColorCSV: Ir a la columna anterior | Ctrl+Alt+Shift+← | Cmd+Alt+Shift+← |
| NoColorCSV: Ir a la siguiente fila de la misma columna | Ctrl+Alt+Shift+↓ | Cmd+Alt+Shift+↓ |
| NoColorCSV: Ir a la fila anterior de la misma columna | Ctrl+Alt+Shift+↑ | Cmd+Alt+Shift+↑ |

Puedes cambiar los atajos buscando `NoColorCSV` en **Métodos abreviados de teclado** de VS Code. Al moverse entre filas, se omiten las que no contienen la columna de destino.

La opción `nocolorcsv.hasHeader` utiliza el primer registro del CSV como encabezados de forma predeterminada. Desactívala para archivos sin encabezados. La numeración de filas siempre comienza en el primer registro.

El analizador admite campos entre comillas, comas y saltos de línea dentro de esos campos, comillas dobles escapadas y BOM UTF-8. El separador es la coma ASCII `,`; la coma de ancho completo `，` se trata como texto.

## Desarrollo

Se requieren [Visual Studio Code](https://code.visualstudio.com/) y Node.js 24.

```sh
npm ci
npm test
```

Abre el repositorio en VS Code y pulsa **F5** para iniciar el entorno de desarrollo de extensiones. La configuración compila TypeScript antes de iniciar. Usa `examples/sample.csv` para comprobar la detección de columnas y la navegación.

Para crear un VSIX instalable:

```sh
npm run package
```

Consulta [AGENTS.md](AGENTS.md) para las convenciones de desarrollo y [LICENSE](LICENSE) para los términos de licencia.
